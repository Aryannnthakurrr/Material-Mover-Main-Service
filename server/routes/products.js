const express = require('express');
const router = express.Router();
const axios = require('axios');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
require('dotenv').config();


// 🆕 HELPER FUNCTION - Notify friend's API of product changes
async function notifyFriendAPI(productData, action) {
  try {
    const friendApiUrl= process.env.FRIEND_API_URL;
    
    if (!friendApiUrl) {
      console.log('⚠ FRIEND_API_URL not set in .env');
      return;
    }

    // Construct webhook URL using backticks for template literals
    const webhookUrl = friendApiUrl + '/webhook/' + action;
    console.log('📤 Notifying friend API: POST' + webhookUrl);
    
    const payload = { 
      product_id: productData._id.toString(),
      title: productData.title,
      category: productData.category,
      description: productData.description,
      price: productData.price,
      quantity: productData.quantity,
      address: productData.address,
      phone_no: productData.phone_no
    };
    
    console.log('📦 Webhook payload:', payload);
    
    const response = await axios.post(webhookUrl, payload, { timeout: 10000 });
    
    console.log('✅' + action + ' webhook sent successfully: ', response.data);
  } catch (err) {
    console.error('❌ Failed to notify friend API for ' +action + ':', err.message);
  }
}

// POST /api/products/search
router.post('/search', auth([]), async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ message: 'query required' });
  
  try {
    const friendServerUrl = process.env.friendServer_Url;
    
    if (friendServerUrl) {
      try {
        const requestUrl = friendServerUrl+ '/recommend?query=' + encodeURIComponent(query);
        console.log('Requesting from friend server:', requestUrl);
        
        const resp = await axios.get(requestUrl, {
          timeout: 5000
        });
        
        console.log('Friend server response:', resp.data);
        
        let ids = [];
        if (Array.isArray(resp.data)) {
          ids = resp.data;
        } else if (Array.isArray(resp.data.productIds)) {
          ids = resp.data.productIds;
        } else if (Array.isArray(resp.data.ids)) {
          ids = resp.data.ids;
        } else if (Array.isArray(resp.data.product_ids)) {
          ids = resp.data.product_ids;
        }
        
        console.log('Extracted product IDs:', ids);
        
        if (ids.length > 0) {
          const products = await Product.find({ _id: { $in: ids } });
          if (products.length > 0) {
            console.log('Found ' +products.length +' products from friends recommendations');
            return res.json({ products, source: 'friend' });
          }
        }
        
        console.log('No products found from friend server, falling back to local search');
      } catch (friendServerErr) {
        console.error('Friend server error details:', {
          message: friendServerErr.message,
          code: friendServerErr.code,
          response: friendServerErr.response?.data
        });
        console.log('Falling back to local search');
      }
    } else {
      console.log('Friend server URL not configured, using local search');
    }

    const searchRegex = new RegExp(query, 'i');
    const products = await Product.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ]
    }).limit(50);

    console.log('Local search found ' +products.length + ' products');
    res.json({ products, source: 'local' });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// GET /api/products/categories
router.get('/categories', auth([]), async (req, res) => {
  res.json({ categories: Product.CATEGORIES });
});

// GET /api/products?ids=comma,separated
router.get('/', auth([]), async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  try {
    if (!ids.length) {
      const all = await Product.find().limit(50);
      return res.json({ products: all });
    }
    const products = await Product.find({ _id: { $in: ids } });
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products (seller only) - create product
router.post('/', auth(['seller', 'admin']), async (req, res) => {
  const { title, description, price, quantity, category, image, address, phone_no } = req.body;
  try {
    if (!title || !description || !category || typeof price !== 'number' || typeof quantity !== 'number' || !address || !phone_no) {
      return res.status(400).json({ 
        message: 'Missing required fields. Title, description, category, price, quantity, address, and phone number are required.' 
      });
    }

    if (price < 0) {
      return res.status(400).json({ message: 'Price must be greater than or equal to 0' });
    }
    if (quantity < 0) {
      return res.status(400).json({ message: 'Quantity must be greater than or equal to 0' });
    }

    const p = new Product({ 
      title, 
      description, 
      price, 
      quantity,
      category,
      image,
      address,
      phone_no,
      seller: req.user.id
    });
    
    await p.save();
    
    // Notify friend's API
    await notifyFriendAPI(p, 'product-added');
    
    res.json({ product: p });
  } catch (err) {
    console.error('Product creation error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(400).json({ message: 'Error creating product', error: err.message });
  }
});

// GET /api/products/my
router.get('/my', auth(['seller', 'admin']), async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id });
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', auth([]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/products/:id - update product
router.put('/:id', auth(['seller', 'admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this product' });
    }

    const { title, description, price, quantity, category, image, address, phone_no } = req.body;

    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (quantity !== undefined) product.quantity = quantity;
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;
    if (address !== undefined) product.address = address;
    if (phone_no !== undefined) product.phone_no = phone_no;

    await product.save();
    
    // Notify friend's API
    await notifyFriendAPI(product, 'product-updated');
    
    res.json({ product });
  } catch (err) {
    console.error('Update product error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', details: Object.values(err.errors).map(e => e.message) });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', auth(['seller', 'admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
