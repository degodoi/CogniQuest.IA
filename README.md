# CogniQuest.IA 🧠

> **Sistema Inteligente de Preparação para Concursos (Vigia & Motorista)**

Desenvolvido por **Marcos Felipe**.

---

## 📋 Sobre o Projeto

O **CogniQuest.IA** é uma aplicação web de alto desempenho projetada para auxiliar candidatos na preparação para concursos públicos, especificamente focado na banca **Instituto JK** (Instituto Social da Cidadania Juscelino Kubitschek).

O sistema utiliza Inteligência Artificial avançada (Google Gemini) para atuar como um "Professor Particular" e "Coach", gerando simulados personalizados, corrigindo questões de forma didática e analisando estrategicamente o desempenho do candidato.

### 🎯 Foco do Estudo
*   **Cargos:** Vigia e Motorista Categoria D.
*   **Banca:** Instituto JK.
*   **Matérias:** Português, Matemática, Conhecimentos Gerais, Legislação de Trânsito (CTB), Direção Defensiva, Mecânica Básica e Segurança Patrimonial.

---

## ✨ Funcionalidades Principais

### 1. 🤖 Geração de Simulados via IA
*   O sistema gera **40 questões inéditas** a cada rodada.
*   Utiliza a ferramenta `googleSearch` para buscar padrões reais e recentes da banca na internet.
*   Adapta o nível de dificuldade e o estilo das perguntas (pegadinhas, tamanho do texto) ao perfil da banca.

### 2. 📚 Explicações Didáticas ("Ensinando do Zero")
*   Ao responder, o sistema não mostra apenas "Certo" ou "Errado".
*   **Matemática:** A IA arma a conta e explica o cálculo passo a passo.
*   **Legislação:** Cita o artigo da lei e dá exemplos práticos do dia a dia.
*   Foco em ensinar usuários leigos de forma simples e direta.

### 3. 💾 Banco de Conhecimento Pessoal (Persistência)
*   Upload de PDFs e arquivos de texto (apostilas, leis, provas antigas).
*   **IndexedDB:** Os arquivos e o histórico de simulados são salvos no navegador. Você pode fechar a aba e voltar depois sem perder seus dados.

### 4. 📊 Análise de Desempenho e Estratégia
*   **Gráficos Visuais:** Acompanhe seus acertos, erros e tempo médio por questão.
*   **Evolução Temporal:** Gráfico de linha mostrando seu progresso ao longo dos dias.
*   **Coach Virtual:** A IA analisa seus erros e gera um relatório textual com:
    *   Pontos Fortes e Fracos.
    *   Padrão identificado da Banca.
    *   Recomendações práticas de estudo.

### 5. 🎨 Interface Moderna
*   Design responsivo (funciona em Celular e PC).
*   **Dark Mode** (Modo Escuro) automático ou manual.
*   Interface limpa e intuitiva.

---

## 🚀 Tecnologias Utilizadas

Este projeto foi construído com as tecnologias mais modernas do ecossistema Web:

*   **Frontend:** [React](https://react.dev/) (v19) com TypeScript.
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (para design responsivo e animações).
*   **Inteligência Artificial:** [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (Gemini 2.5 Flash / Gemini 3).
*   **Visualização de Dados:** [Recharts](https://recharts.org/) (para gráficos avançados).
*   **Ícones:** [Lucide React](https://lucide.dev/).
*   **Armazenamento:** IndexedDB (Nativo do navegador) para persistência de dados local.

---

## 📦 Como Rodar o Projeto

### Pré-requisitos
*   Node.js instalado.
*   Uma chave de API do Google Gemini (Google AI Studio).

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/CogniQuest.IA.git
    cd CogniQuest.IA
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure a API Key:**
    *   Crie um arquivo `.env` na raiz do projeto (ou configure no seu ambiente de deployment).
    *   Adicione sua chave:
    ```env
    API_KEY=sua_chave_do_google_ai_studio_aqui
    ```
    *   *Nota:* O código está configurado para ler `process.env.API_KEY`. Certifique-se de que seu bundler (Vite, Webpack, Parcel) esteja configurado para expor essa variável ou use a configuração adequada para o seu ambiente.

4.  **Execute o projeto:**
    ```bash
    npm start
    # ou
    npm run dev
    ```

5.  **Acesse:**
    Abra seu navegador em `http://localhost:3000` (ou a porta indicada).

---

## 🛡️ Privacidade

O **CogniQuest.IA** preza pela privacidade:
*   Seus PDFs são processados pela IA para gerar contexto, mas são armazenados **localmente** no seu dispositivo (via IndexedDB).
*   Nenhum dado pessoal é enviado para servidores externos além do necessário para a API do Google Gemini gerar as questões.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir *issues* para reportar bugs ou *pull requests* com melhorias.

---

## 📝 Créditos

Desenvolvido com dedicação por **Marcos Felipe**.

---

*"O sucesso é a soma de pequenos esforços repetidos dia após dia."*
