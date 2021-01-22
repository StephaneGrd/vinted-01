const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/isAuthenticated");

const User = require("../models/User");
const Offer = require("../models/Offer");

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    // Destructuring
    const {
      title,
      description,
      price,
      size,
      brand,
      condition,
      city,
      color,
    } = req.fields;

    // Créer une nouvelle annonce
    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        {
          MARQUE: brand,
        },
        {
          TAILLE: size,
        },
        {
          ÉTAT: condition,
        },
        {
          COULEUR: color,
        },
        {
          EMPLACEMENT: city,
        },
      ],
      // Pour faire une réf je peux soit envoyer l'id, soit envoyer le document complet
      owner: req.user,
    });

    // console.log(newOffer);

    // Envoyer l'image à cloudinary
    const result = await cloudinary.uploader.upload(req.files.picture.path, {
      folder: `/vinted/offers/${newOffer._id}`,
    });

    // Aujouter le resultat de l'upload dans newOffer
    newOffer.product_image = result;
    // Sauvegarder l'annonce
    await newOffer.save();

    // Répondre au client
    res.status(200).json(newOffer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
//----------------------------------------------------------
router.get("/offers", async (req, res) => {
  try {
    let filters = {};

    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
    }
    if (req.query.priceMin) {
      filters.product_price = {
        $gte: Number(req.query.priceMin),
      };
    }

    if (req.query.priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = Number(req.query.priceMax);
      } else {
        filters.product_price = {
          $lte: Number(req.query.priceMax),
        };
      }
    }

    let sort = {};

    if (req.query.sort === "price-desc") {
      sort.product_price = -1;
    }

    if (req.query.sort === "price-asc"){
      sort.product_price = 1;
    }

    let page

    if (req.query.page < 1) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }
    let limit = Number(req.query.limit);
    
    const count = await Offer.countDocuments(filters);
   
    const offers = await Offer.find(filters)
      .sort(sort)
      .skip((page - 1) * limit) // permet un limit dynamique
      .limit(limit)
      .select("product_name product_price"); 
    res.status(200).json({
      count: count,
      offer: offers,
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;