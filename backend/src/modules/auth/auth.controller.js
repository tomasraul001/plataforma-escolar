import "dotenv/config";
import prisma from "../../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { validateEmail, validatePassword } from "../../utils/validations.js";

const REFRESH_TOKEN_TTL_DAYS = 7;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return token;
}

async function cleanupExpiredTokens(userId) {
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
}

// Registro de usuario
export const register = async (req, res) => {
  let { name, email, password, accessKey, phone } = req.body;

  const envKeys = [
    process.env.COORDENADOR_KEY,
    process.env.FORMADOR_KEY,
    process.env.FORMANDO_KEY,
    process.env.SECRETARIA_KEY,
  ];
  if (envKeys.some((k) => !k)) {
    return res.status(500).json({ message: "Chaves de acesso não configuradas. Contacte o administrador." });
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const accessKeysMap = {
    [process.env.COORDENADOR_KEY]: "coordenador",
    [process.env.FORMADOR_KEY]: "formador",
    [process.env.FORMANDO_KEY]: "formando",
    [process.env.SECRETARIA_KEY]: "secretaria",
  };

  let validKey = accessKeysMap[accessKey];
  if (!validKey) {
    return res.status(401).json({ message: "Chave de acesso inválida!" });
  }

  let salt = await bcrypt.genSalt(10);

  try {
    const userExist = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (userExist) {
      return res.status(400).json({ message: "Este email ja existe" });
    }

    let userRegist = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: await bcrypt.hash(password, salt),
        role: validKey,
        phone: phone || null,
      },
    });
    const { password: _, ...userSafe } = userRegist;
    res.status(201).json({ message: "Registado com sucesso!", user: userSafe });
  } catch (error) {
    res.status(500).json({ message: "Erro ao registrar usuário!" });
    console.log(error);
  }
};

// Login do usuario
export const login = async (req, res) => {
  try {
    let userLogin = await prisma.user.findUnique({
      where: { email: req.body.email.toLowerCase() },
    });

    if (!userLogin) {
      return res.status(404).json({ message: "Usuário não encontrado!" });
    }

    let isMatch = await bcrypt.compare(req.body.password, userLogin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Senha incorreta!" });
    }

    let token = jwt.sign(
      { id: userLogin.id, email: userLogin.email, role: userLogin.role },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    await cleanupExpiredTokens(userLogin.id);
    const refreshToken = await issueRefreshToken(userLogin.id);

    res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      refreshToken,
      role: userLogin.role,
      name: userLogin.name,
      id: userLogin.id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erro ao fazer login!" });
  }
};

// Refresh token
export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token obrigatório!" });
  }

  try {
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      return res.status(401).json({ message: "Refresh token inválido!" });
    }

    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return res.status(401).json({ message: "Refresh token revogado!" });
    }

    if (stored.expiresAt < new Date()) {
      return res.status(401).json({ message: "Refresh token expirado!" });
    }

    const newAccessToken = jwt.sign(
      { id: stored.user.id, email: stored.user.email, role: stored.user.role },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshToken = await issueRefreshToken(stored.userId);

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      role: stored.user.role,
      name: stored.user.name,
      id: stored.user.id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erro ao renovar token!" });
  }
};

// Logout
export const logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(200).json({ message: "Logout realizado!" });
  }

  try {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    // Silently fail — idempotent
  }

  res.status(200).json({ message: "Logout realizado!" });
};
