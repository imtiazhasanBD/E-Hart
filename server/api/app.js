require('dotenv').config();
const express = require("express");
const app = express();
const cors = require("cors");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cors());

// Checkout API
app.post("/api/create-checkout-session", async (req, res) => {
  const { products } = req.body;

  try {
    // Calculate items to send to Stripe
    const extractingItems = products.map(product => ({
      quantity: product.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round((product.price - (product.price * product.discountPercentage) / 100) * 100), // Convert to cents
        product_data: {
          name: product.title,
          description: product.description,
          images: product.images || [], // Stripe expects an array
        },
      },
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: extractingItems,
      mode: "payment",
      success_url:"http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:"http://localhost:5173/cancel",
    });

    res.status(201).json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Retrieve Checkout Session API
app.get('/api/get-checkout-session/:id', async (req, res) => {
  const sessionId = req.params.id;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.status(200).json(session);
  } catch (error) {
    console.error("Error retrieving checkout session:", error.message);
    res.status(404).json({ error: "Checkout session not found" });
  }
});

// Start Server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
