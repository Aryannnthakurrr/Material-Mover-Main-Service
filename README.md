# Material Mover

Lightweight marketplace for construction materials with Buyer, Seller and Admin roles.  
Backend: Node.js + Express + MongoDB (Mongoose). Frontend: static HTML/CSS/JS in `public/`. Auth uses JWT; passwords are hashed with bcrypt.

## Key features
- Buyer, Seller and Admin roles
- Signup (buyer/seller) and admin-managed accounts
- JWT-based auth for protected actions
- Sellers can create, edit and delete products and upload images
- Admin can search, edit and delete products and manage users
- Public product search — contact details (address, phone_number) visible only to logged-in users
- Category support for products

## Prerequisites
- Node.js (LTS)
- MongoDB instance (local or Atlas)
- Git (optional)

## Environment
Create a `.env` file in the project root (copy from `.env.example`) and set:
- MONGODB_URI=your-mongodb-connection-string
- JWT_SECRET=strong_random_secret
- PORT=3000
- SEARCH_WEBHOOK_URL=optional_webhook_url_for_vector_search

Do NOT commit `.env`.

## Install dependencies
Run these commands in PowerShell from project root (E:\web dev\Material Mover):

1) Install runtime dependencies
```powershell
npm install express mongoose bcryptjs jsonwebtoken multer cors dotenv axios
```

2) Install useful dev dependencies
```powershell
npm install --save-dev nodemon
```

3) If your project uses serverless handler for Vercel, optionally install:
```powershell
npm install serverless-http
```

4) If you used any test/seed generators (optional)
```powershell
npm install --save-dev faker
```

After this you can run:
```powershell
# install from package.json (if present)
npm install
```

## Run (local)
Open PowerShell in project root:
```powershell
cd "E:\web dev\Material Mover"
copy .env.example .env
# edit .env with your values
npm run dev   # or npm start
```
Then open http://localhost:3000

## Project layout (important)
- api/ or server/ — Express entry and server code
- server/models/ — Mongoose models (User, Product)
- server/routes/ — API routes (auth, products, uploads)
- public/ — frontend pages (index.html, login.html, signup.html, seller.html, admin.html)
- uploads/ — image uploads (gitignored)
- seed/ — optional scripts (not required)
- .env.example, .gitignore, README.md

## User creation & auth
- Public signup route allows creating Buyer or Seller accounts.
- Admins can create admin accounts using protected API.
- Passwords are hashed with bcryptjs before storing.
- Login returns a JWT; include `Authorization: Bearer <token>` for protected requests.

## Important API endpoints (quick)
- POST /api/auth/signup — public signup (buyer/seller)
- POST /api/auth/login — login, returns JWT
- POST /api/auth/create-user — admin only
- DELETE /api/auth/users/:id — admin only (delete user and their products)
- GET /api/products — list products (public)
- POST /api/products — create product (seller)
- GET /api/products/:id — get product
- PUT /api/products/:id — update product (owner or admin)
- DELETE /api/products/:id — delete product (owner or admin)
- POST /api/products/search — search (can call webhook; falls back to local search)
- GET /api/products/categories — list categories
- POST /api/upload/image — upload image (seller/admin)

Note: Contact fields (`address`, `phone_number`) are returned only for authenticated requests.

## Frontend pages
- `/` or `/index.html` — search & browse
- `/login.html` — login
- `/signup.html` — signup (buyer/seller)
- `/seller.html` — seller dashboard (product management)
- `/admin.html` — admin panel (user & product management)

## Security notes
- Passwords hashed with bcryptjs (do not store plaintext).
- Use a strong `JWT_SECRET` and keep it out of source control.
- For production, prefer httpOnly secure cookies for tokens instead of localStorage.
- Add rate limiting and stronger validation for auth endpoints in production.
- Consider using managed storage (S3/Cloudinary) for images in production.

## Debugging & tips
- If protected endpoints return auth errors, ensure client omits empty Authorization headers when not logged in.
- If product creation fails, verify required fields: title, description, price, quantity, category (and address/phone if model requires).
- Inspect server logs for validation errors returned by Mongoose.
