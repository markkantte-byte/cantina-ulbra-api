const express = require('express');
const controller = require('../controllers/relatoriosController');

const router = express.Router();

router.get('/vendas-por-categoria', controller.vendasPorCategoria);
router.get('/top-produtos', controller.topProdutos);
router.get('/faturamento', controller.faturamento);

module.exports = router;
