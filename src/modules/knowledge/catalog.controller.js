import * as service from './catalog.service.js';

export async function listProducts(req, res) {
  const products = await service.listProducts(req.auth.orgId, req.params.agentId);
  res.json({ products });
}

export async function createProduct(req, res) {
  const product = await service.createProduct(req.auth.orgId, req.params.agentId, req.body);
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  const product = await service.updateProduct(req.auth.orgId, req.params.agentId, req.params.productId, req.body);
  res.json({ product });
}

export async function deleteProduct(req, res) {
  await service.deleteProduct(req.auth.orgId, req.params.agentId, req.params.productId);
  res.status(204).send();
}

export async function clearProducts(req, res) {
  const result = await service.clearProducts(req.auth.orgId, req.params.agentId);
  res.json(result);
}

export async function importProducts(req, res) {
  // При multipart-загрузке mapping приходит строкой (JSON) в поле формы — разбираем его.
  let mapping = req.body?.mapping;
  if (typeof mapping === 'string') {
    try { mapping = JSON.parse(mapping); } catch { mapping = undefined; }
  }
  const opts = { mapping, itemSelector: req.body?.itemSelector || undefined };
  const result = await service.importProducts(req.auth.orgId, req.params.agentId, req.file, opts);
  res.status(202).json(result);
}

export async function previewFeed(req, res) {
  const result = await service.previewFeed(req.auth.orgId, req.params.agentId, req.body);
  res.json(result);
}

export async function getImportJobStatus(req, res) {
  const result = await service.getImportJobStatus(req.auth.orgId, req.params.agentId, req.params.jobId);
  res.json(result);
}

export async function importProductsFromUrl(req, res) {
  const result = await service.importProductsFromUrl(req.auth.orgId, req.params.agentId, req.body);
  res.status(201).json(result);
}

export default { listProducts, createProduct, updateProduct, deleteProduct, clearProducts, importProducts, importProductsFromUrl, previewFeed, getImportJobStatus };
