# CogniQuest 🧠

> **Sistema Avançado de Preparação para Concursos**

Desenvolvido por **Marcos Felipe**.

---

## 📋 Sobre o Projeto

O **CogniQuest** é uma plataforma web de alto desempenho projetada para auxiliar candidatos na preparação para concursos públicos. O sistema atua como um "Professor Particular" e "Coach" virtual, criando simulados personalizados, corrigindo questões de forma didática e analisando estrategicamente o seu desempenho para otimizar seus estudos.

### 🎯 Foco do Estudo
*   **Cargos:** Vigia, Motorista Categoria D, Assistente Administrativo, entre outros.
*   **Bancas:** Instituto JK, Cebraspe, Vunesp, FGV, etc.
*   **Matérias:** Português, Matemática, Conhecimentos Gerais, Legislação de Trânsito (CTB), Direção Defensiva, Mecânica Básica, Segurança Patrimonial e muito mais.

---

## ✨ Funcionalidades Principais

### 1. 📝 Geração de Simulados Personalizados
*   O sistema cria questões inéditas focadas no seu cargo e na banca escolhida.
*   Adapta o nível de dificuldade e o estilo das perguntas (pegadinhas, tamanho do texto) ao perfil da prova que você vai prestar.

### 2. 🎓 Professor Virtual (Tira-Dúvidas Interativo)
*   **Chat Interativo:** Se a explicação de uma questão não for suficiente, você pode clicar em "Não entendi, me ajude!" para conversar com o professor virtual.
*   **Explicações sob medida:** O sistema sabe qual questão você errou e qual opção você marcou, fornecendo explicações passo a passo para a sua dúvida específica.

### 3. 🔥 Consistência de Estudos (Ofensiva)
*   **Contador de Ofensiva (Streak):** O sistema motiva você a estudar todos os dias, exibindo há quantos dias seguidos você está focado.
*   Acompanhe seu progresso diário e crie o hábito da aprovação.

### 4. 📚 Explicações Didáticas ("Ensinando do Zero")
*   Ao responder, o sistema não mostra apenas "Certo" ou "Errado".
*   **Matemática:** Arma a conta e explica o cálculo passo a passo.
*   **Legislação:** Cita o artigo da lei e dá exemplos práticos do dia a dia.

### 5. 💾 Banco de Conhecimento Pessoal
*   Faça o envio (upload) de PDFs e arquivos de texto (apostilas, leis, provas antigas) para basear seus estudos.
*   Os arquivos, o histórico de simulados e o **Banco de Erros** ficam salvos com segurança diretamente no seu navegador.

### 6. 📊 Análise de Desempenho e Estratégia
*   **Gráficos Visuais:** Acompanhe seus acertos, erros e tempo médio por questão.
*   **Rastreamento de Tempo:** Gráfico de horas acumuladas e duração de cada sessão de estudo.
*   **Coach Virtual:** O sistema analisa seus erros e gera um relatório com recomendações estratégicas de estudo.

---

## 🚀 Como Usar o Sistema (Para Iniciantes)

Não é preciso ser um especialista em tecnologia para usar o CogniQuest! Siga os passos simples abaixo:

### 1. Acessando o Sistema
Basta abrir o link do aplicativo no seu navegador (pelo computador ou celular).

### 2. Configurando sua Chave de Acesso (Muito Importante!)
Para que o sistema consiga gerar as questões e corrigir suas respostas, ele precisa de uma "Chave de Acesso" gratuita do Google.

**Como conseguir e colocar a chave:**
1. Acesse o site de chaves do Google: [Clique aqui para acessar](https://aistudio.google.com/app/apikey).
2. Faça login com a sua conta do Google (seu Gmail normal).
3. Clique no botão azul escrito **"Create API key"** (Criar chave).
4. Copie o código longo que vai aparecer na tela.
5. Abra o **CogniQuest**, clique no **ícone de engrenagem (Configurações)** no canto superior direito da tela.
6. Cole o código no campo indicado e clique em **"Salvar Configurações"**.

Pronto! Você só precisa fazer isso uma vez. A chave fica salva com segurança no seu próprio navegador.

### 3. Criando seu Primeiro Simulado
1. Na tela inicial, digite o nome da **Banca** do seu concurso (ex: Vunesp, Cebraspe, Instituto JK).
2. Digite o **Cargo** que você quer (ex: Motorista, Assistente Administrativo).
3. Escolha o seu nível de **Escolaridade**.
4. (Opcional) Anexe arquivos em PDF ou digite um tema específico que você quer estudar hoje.
5. Clique em **"Gerar Simulado"** e bons estudos!

---

## 💻 Como Rodar o Projeto no seu Computador (Para Desenvolvedores)

Se você é programador e quer rodar o código no seu próprio computador:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/CogniQuest.git
    cd CogniQuest
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Execute o projeto:**
    ```bash
    npm run dev
    ```

4.  **Acesse:**
    Abra seu navegador em `http://localhost:3000`.

*(A configuração da chave de acesso pode ser feita pela interface do sistema clicando na engrenagem, ou criando um arquivo `.env` na raiz do projeto com a linha `GEMINI_API_KEY=sua_chave_aqui`).*

---

## 🛡️ Privacidade

O **CogniQuest** preza pela sua privacidade:
*   Seus PDFs e histórico de estudos são armazenados **localmente** no seu próprio dispositivo.
*   Seus dados não são compartilhados com terceiros.

---

## 📝 Créditos

Desenvolvido com dedicação por **Marcos Felipe**.

---

*"O sucesso é a soma de pequenos esforços repetidos dia após dia."*