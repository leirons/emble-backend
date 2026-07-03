import * as authService from './auth.service.js';

export async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function refresh(req, res) {
  const result = await authService.refresh(req.body);
  res.json(result);
}

export async function logout(req, res) {
  await authService.logout(req.body);
  res.status(204).send();
}

export async function me(req, res) {
  const user = await authService.me(req.auth.userId);
  res.json({ user });
}

export default { register, login, refresh, logout, me };
