const express = require('express');
const controller = require('../controllers/pedidosController');

const router = express.Router();

router.get('/', controller.listar);
router.get('/:id', controller.buscar);
router.post('/', controller.criar);
router.delete('/:id', controller.remover);

module.exports = router;
