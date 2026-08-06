import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { ClienteController } from '../controllers/ClienteController.js';
import { ProfissionalController } from '../controllers/ProfissionalController.js';
import { ProcedimentoController } from '../controllers/ProcedimentoController.js';
import { AtendimentoController } from '../controllers/AtendimentoController.js';
import { DashboardController } from '../controllers/DashboardController.js';
import { DespesaController } from '../controllers/despesaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { RelatorioController } from '../controllers/RelatorioController.js';
import { NotaFiscalController } from '../controllers/NotaFiscalController.js';
import { NotaFiscalClienteController } from '../controllers/NotaFiscalClienteController.js';
import { DashboardFinanceiroController } from '../controllers/DashboardFinanceiroController.js';
import { UsuarioController } from '../controllers/UsuarioController.js';



const router = Router();
const authController = new AuthController();
const clienteController = new ClienteController();
const profissionalController = new ProfissionalController();
const procedimentoController = new ProcedimentoController();
const atendimentoController = new AtendimentoController();
const dashboardController = new DashboardController();
const despesaController = new DespesaController();
const relatorioController = new RelatorioController();
const notaFiscalController = new NotaFiscalController();
const notaFiscalClienteController = new NotaFiscalClienteController();
const dashboardFinanceiroController = new DashboardFinanceiroController();
const usuarioController = new UsuarioController();

router.get('/usuarios', usuarioController.listar);
router.post('/usuarios', usuarioController.criar);

// ⚠️ ATENÇÃO: Esta rota ESPECÍFICA tem que vir ANTES da rota com :id
router.put('/usuarios/alterar-senha', usuarioController.alterarSenhaPrimeiroAcesso);

// Rota genérica com ID vem DEPOIS
router.put('/usuarios/:id', usuarioController.atualizar);
router.delete('/usuarios/:id', usuarioController.excluir);


router.get('/dashboard/financeiro', dashboardFinanceiroController.obterResumo);

// Rotas de Simulação de Nota Fiscal (Padronizadas sem o /api duplicado)
router.get('/notas-fiscais/simular', authMiddleware, (req, res) => notaFiscalController.simularNotaFiscal(req, res));
router.get('/notas-fiscais-clientes/simular', authMiddleware, (req, res) => notaFiscalClienteController.simularNotaFiscalCliente(req, res));

// Rotas Públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rotas Protegidas - Dashboard
router.get('/dashboard/resumo', authMiddleware, dashboardController.obterResumo);

// Rotas Protegidas - Clientes
router.get('/clientes', authMiddleware, clienteController.listar);
router.get('/clientes/:id', authMiddleware, clienteController.obterPorId);
router.post('/clientes', authMiddleware, clienteController.criar);
router.put('/clientes/:id', authMiddleware, clienteController.atualizar);
router.delete('/clientes/:id', authMiddleware, clienteController.deletar);

// Rotas Protegidas - Procedimentos
router.get('/procedimentos', authMiddleware, procedimentoController.listar);
router.post('/procedimentos', authMiddleware, procedimentoController.criar);
router.put('/procedimentos/:id', authMiddleware, procedimentoController.atualizar);
router.delete('/procedimentos/:id', authMiddleware, procedimentoController.deletar);

// Rotas Protegidas - Atendimentos
router.get('/atendimentos', authMiddleware, atendimentoController.listar);
router.post('/atendimentos', authMiddleware, atendimentoController.criar);
router.put('/atendimentos/:id', authMiddleware, atendimentoController.atualizar);
router.delete('/atendimentos/:id', authMiddleware, atendimentoController.excluir);

// Rotas Protegidas - Profissionais
router.get('/profissionais', authMiddleware, profissionalController.listar);
router.post('/profissionais', authMiddleware, profissionalController.criar);
router.put('/profissionais/:id', authMiddleware, profissionalController.atualizar);
router.delete('/profissionais/:id', authMiddleware, profissionalController.excluir);

// Rotas Protegidas - Despesas do Consultório
router.put('/despesas/:id', authMiddleware, despesaController.atualizar);
router.get('/despesas', authMiddleware, despesaController.listar);
router.post('/despesas', authMiddleware, despesaController.criar);
router.delete('/despesas/:id', authMiddleware, despesaController.deletar);

// Rotas Protegidas - Relatórios (Profissional e Cliente)
router.get('/relatorios/profissional', authMiddleware, relatorioController.obterRelatorioProfissional);
router.get('/relatorios/cliente', authMiddleware, (req, res) => relatorioController.obterRelatorioCliente(req, res)); // <-- ADICIONADO AQUI

// Rotas Protegidas - Relatórios (Profissional e Cliente)
router.get('/relatorios/profissional', authMiddleware, relatorioController.obterRelatorioProfissional);
router.get('/relatorios/cliente', authMiddleware, (req, res) => relatorioController.obterRelatorioCliente(req, res));







export default router;
export { router };