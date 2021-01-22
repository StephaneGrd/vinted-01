const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  try {
    // Rechercher dans la BDD si un user possède déjà cet email
    const user = await User.findOne({ email: req.fields.email });

    if (!user) {
      // Si non, on fait la suite...
      // est-ce que je reçois tout ce qu'il faut ? (email, username, password)
      if (req.fields.email && req.fields.username && req.fields.password) {
        // Je peux faire la création
        // Etape 1 : encrypter le mot de passe
        const salt = uid2(64);
        const hash = SHA256(req.fields.password + salt).toString(encBase64);
        const token = uid2(64);
        // Etape 2 : créer le nouvel utilisateur
        const newUser = new User({
          email: req.fields.email,
          account: {
            username: req.fields.username,
            phone: req.fields.phone,
          },
          token: token,
          hash: hash,
          salt: salt,
        });
        // Etape 3 : sauvegarde de l'utilisateur
        await newUser.save();
        // Etape 4 : répondre au client
        res.status(200).json({
          _id: newUser._id,
          token: newUser.token,
          account: {
            username: newUser.account.username,
            phone: newUser.account.phone,
          },
        });
      } else {
        res.status(400).json({ message: "Missing parameters" });
      }
    } else {
      // Si oui, on renvoie un message d'erreur
      res.status(400).json({ message: "This email already has an account" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    // Trouve dans la BDD le user qui veut se connecter
    const user = await User.findOne({ email: req.fields.email });
    if (user) {
      //   console.log(user);
      // Est-ce qu'il a rentré le bon mot de passe ?
      // générer un nouveau hash avec le password rentré + le salt du user trouvé
      const newHash = SHA256(req.fields.password + user.salt).toString(
        encBase64
      );
      // Si ce hash est le même que le hash du user trouvé => OK
      if (newHash === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: {
            username: user.account.username,
            phone: user.account.phone,
          },
        });
      } else {
        // Sinon => Erreur
        res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
