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

### 2. 🎓 Professor Virtual (Tira-Dúvidas Interativo)
*   **Chat Inteligente:** Se a explicação automática não for suficiente, você pode clicar em "Não entendi, me ajude!" para conversar com a IA.
*   **Personalização:** A IA sabe qual questão você errou e qual opção você marcou, fornecendo explicações sob medida para sua dúvida específica.

### 3. 🔥 Consistência de Estudos (Ofensiva)
*   **Contador de Streak:** O sistema motiva você a estudar todos os dias, exibindo há quantos dias seguidos você está focado.
*   Acompanhe seu progresso e crie o hábito da aprovação.

### 4. 📚 Explicações Didáticas ("Ensinando do Zero")
*   Ao responder, o sistema não mostra apenas "Certo" ou "Errado".
*   **Matemática:** A IA arma a conta e explica o cálculo passo a passo.
*   **Legislação:** Cita o artigo da lei e dá exemplos práticos do dia a dia.

### 5. 💾 Banco de Conhecimento Pessoal (Persistência)
*   Upload de PDFs e arquivos de texto (apostilas, leis, provas antigas).
*   **IndexedDB:** Os arquivos, o histórico de simulados e o **Banco de Erros** são salvos no navegador.

### 6. 📊 Análise de Desempenho e Estratégia
*   **Gráficos Visuais:** Acompanhe seus acertos, erros e tempo médio por questão.
*   **Rastreamento de Tempo de Estudo:** Gráfico de horas acumuladas e duração de cada sessão de estudo.
*   **Coach Virtual:** A IA analisa seus erros e gera um relatório textual com recomendações estratégicas.

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

### 🔑 Configuração da API Key (Obrigatório)

Para que a Inteligência Artificial funcione, você precisa configurar sua chave de API:

1.  Crie um arquivo chamado **`.env`** na raiz do projeto (mesma pasta do `package.json`).
2.  Adicione sua chave neste arquivo da seguinte forma:
    ```env
    API_KEY=Sua_Chave_AIzaSy_Aqui
    ```
    *(Nota: Se estiver usando Vite e a chave não for reconhecida, tente usar `VITE_API_KEY=...` e ajuste o código se necessário, mas o padrão deste projeto busca por `process.env.API_KEY` via configuração do bundler).*

3.  Salve o arquivo.
4.  Reinicie o terminal/servidor se ele já estiver rodando.

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

3.  **Execute o projeto:**
    ```bash
    npm start
    # ou
    npm run dev
    ```

4.  **Acesse:**
    Abra seu navegador em `http://localhost:3000`.

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