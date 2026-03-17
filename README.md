<ArtifactMetadata>
  <ArtifactType>other</ArtifactType>
  <Summary>Updated README.md to be more visual, structured, and professional.</Summary>
</ArtifactMetadata>

<div align="center">
  <img src="https://i.imgur.com/u4zNkcu.png" alt="CogniQuest Logo" width="120" />
  <h1>🧠 CogniQuest.IA</h1>
  <p><strong>Sistema Avançado de Preparação para Concursos (Multi-Banca)</strong></p>
  <p>Desenvolvido por <strong>Marcos Felipe</strong></p>

  <p>
    <a href="#-sobre-o-projeto">Sobre</a> •
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-tecnologias">Tecnologias</a> •
    <a href="#-como-usar">Como Usar</a> •
    <a href="#-para-desenvolvedores">Para Devs</a>
  </p>
</div>

---

## 📋 Sobre o Projeto

O **CogniQuest** é uma plataforma web inovadora projetada para ser o seu **"Professor Particular" e "Coach" virtual** na preparação para concursos públicos. Utilizando inteligência artificial avançada (Google Gemini), o sistema cria simulados perfeitamente adaptados ao seu edital, corrige questões de forma didática e gera análises estratégicas do seu desempenho.

### 🎯 Foco Customizável
*   **Cargos:** Vigia, Motorista, Assistente Administrativo, Técnico, Analista e muito mais.
*   **Bancas:** Cebraspe, Vunesp, FGV, Instituto JK, FCC, etc.
*   **Áreas de Estudo:** Português, Matemática, Legislação (CTB, ECA, CF/88), Conhecimentos Específicos, etc.

---

## ✨ Funcionalidades Principais

| Recurso | Descrição |
| :--- | :--- |
| **📝 Geração Dinâmica** | Questões inéditas geradas por IA, focadas na sua banca e cargo, com nível de dificuldade e estilo precisos. |
| **🎓 Professor Virtual** | Não entendeu o gabarito? Clique em "Me ajude!" e o professor virtual explica passo a passo, como se conversasse com você. |
| **🔥 Ofensiva (Streak)** | Gamificação! Mantenha a consistência estudando todos os dias e acompanhe seu contador de ofensiva. |
| **📚 Explicações Didáticas** | Correções detalhadas: em exatas, arma a conta; em direito, cita a lei e dá exemplos práticos. |
| **📁 Banco Pessoal** | Faça upload de PDFs (editais, leis, apostilas) para gerar simulados diretamente do seu material base. |
| **📊 Análise Estratégica** | Gráficos de acertos/erros, tempo médio e um relatório do "Coach Virtual" apontando onde você precisa focar mais. |
| **🌓 Tema Escuro/Claro** | Interface moderna que se adapta à sua preferência de visualização (Dark Mode nativo). |

---

## 🚀 Como Usar (Para Candidatos)

O sistema foi feito para ser simples e direto ao ponto:

1. **Acesse a Aplicação:** Abra o site no seu computador ou celular.
2. **Configure a sua IA (Importante!)**
   * Por segurança e gratuidade, o sistema usa a sua própria chave do Google.
   * Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey) e faça login com seu Gmail.
   * Clique em **"Create API key"** e copie o código gerado.
   * No **CogniQuest**, clique na engrenagem ⚙️ (canto superior direito), cole o código e salve. *(Fica salvo apenas no seu navegador!)*
3. **Crie seu Simulado:**
   * Preencha a **Banca**, o **Cargo** e seu nível de **Escolaridade**.
   * *(Opcional)* Envie um PDF de estudo.
   * Clique em **"Gerar Simulado"** e comece a treinar!

---

## 💻 Para Desenvolvedores (Como Rodar Localmente)

Este projeto foi construído com as melhores e mais modernas tecnologias do ecossistema web:

### 🛠️ Tecnologias
*   **React 19** + **Vite** (Frontend ultrarrápido)
*   **TypeScript** (Segurança e tipagem)
*   **Tailwind CSS** (Estilização e Dark Mode)
*   **Recharts** (Gráficos visuais de desempenho)
*   **Google Gemini AI API** (`@google/genai`)

### ⚙️ Instalação Passo a Passo

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/CogniQuest.git

# 2. Acesse a pasta do projeto
cd CogniQuest

# 3. Instale as dependências
npm install

# 4. Configure as Variáveis de Ambiente
# Crie um arquivo .env na raiz do projeto e adicione sua chave de teste:
# VITE_GEMINI_API_KEY=sua_chave_aqui

# 5. Rode o servidor de desenvolvimento
npm run dev
```

Abra `http://localhost:5173` no seu navegador para ver o app rodando.

---

## 🛡️ Privacidade e Armazenamento

*   **100% Local:** Seus PDFs, histórico de simulados e configurações de API são armazenados localmente no seu dispositivo (usando `localStorage` e processamento em memória).
*   **Sem rastreamento:** Nenhum dado pessoal seu ou documento enviado é salvo em servidores de terceiros (exceto o processamento em tempo real feito pela IA do Google).

---

<div align="center">
  <i>"O sucesso é a soma de pequenos esforços repetidos dia após dia."</i><br><br>
  Desenvolvido com 🩵 por <b>Marcos Felipe</b>
</div>