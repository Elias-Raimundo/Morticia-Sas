import * as authService from "../services/auth.service.js";

export const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    const errors = {
      BODY_INVALIDO: "Body inválido (no llegó JSON)",
      FALTAN_DATOS: "Faltan datos (name, email, password)",
    };

    res.status(400).json({ error: errors[error.message] || error.message });
  
  }
};

export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};