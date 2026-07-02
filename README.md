# Chef de Geladeira

Aplicativo de prototipo para a atividade pratica **LLM via OpenRouter**.

O usuario informa de **3 a 5 ingredientes** que tem sobrando na geladeira, e o sistema envia esses dados para um modelo de linguagem pela API do OpenRouter. A IA responde com uma receita criativa usando **somente os ingredientes informados**.

A resposta da IA nao e exibida em Markdown. O backend exige que o modelo retorne um **objeto JSON valido** e a aplicacao devolve esse JSON pela rota `/api/receita`.

## Modelo utilizado

```txt
nvidia/nemotron-3-ultra-550b-a55b:free
```

O modelo pode ser alterado no arquivo `.env`, mas o projeto ja vem configurado para o modelo solicitado na atividade.

## Tecnologias

- Node.js
- Express
- OpenRouter API
- HTML, CSS e JavaScript puro
- dotenv para proteger a chave da API

## Como instalar

1. Instale o Node.js.
2. Abra o terminal na pasta do projeto.
3. Instale as dependencias:

```bash
npm install
```

## Como configurar a chave do OpenRouter

1. Crie uma conta em https://openrouter.ai.
2. Gere uma chave de API.
3. Copie o arquivo `.env.example` e renomeie a copia para `.env`.
4. Cole sua chave no campo `OPENROUTER_API_KEY`.

Exemplo:

```env
OPENROUTER_API_KEY=sua_chave_real_aqui
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
PORT=3000
```

Importante: o arquivo `.env` nao deve ser enviado para o GitHub. Ele ja esta protegido pelo `.gitignore`.

## Como executar

Para rodar o projeto:

```bash
npm start
```

Depois abra:

```txt
http://localhost:3000
```

Durante o desenvolvimento tambem e possivel usar:

```bash
npm run dev
```

## Como usar

1. Digite de 3 a 5 ingredientes separados por virgula, ponto e virgula ou quebra de linha.
2. Clique em **Gerar receita**.
3. O backend valida os ingredientes.
4. O backend chama o OpenRouter sem expor a chave no navegador.
5. A tela mostra a receita e tambem o JSON bruto retornado.

## Endpoint principal

### POST `/api/receita`

Corpo da requisicao:

```json
{
  "ingredientes": ["arroz cozido", "tomate", "queijo", "ovo"]
}
```

Resposta esperada:

```json
{
  "erro": false,
  "modelo": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "receita": {
    "nome_receita": "string",
    "conceito": "string",
    "tempo_estimado_minutos": 20,
    "nivel_dificuldade": "facil",
    "porcoes": 2,
    "ingredientes_usados": [
      {
        "nome": "arroz cozido",
        "quantidade_sugerida": "1 xicara"
      }
    ],
    "modo_preparo": [
      {
        "ordem": 1,
        "instrucao": "string"
      }
    ],
    "dicas_servir": ["string"],
    "validacao": {
      "usa_apenas_ingredientes_informados": true,
      "ingredientes_informados": ["arroz cozido", "tomate", "queijo", "ovo"],
      "ingredientes_nao_utilizados": [],
      "ingredientes_fora_da_lista": []
    }
  }
}
```

## Protecao da chave

A chave do OpenRouter fica apenas no backend, dentro do arquivo `.env`.

O navegador chama somente a rota local `/api/receita`, entao a chave nao aparece no JavaScript publico nem no HTML.

## Estrutura do projeto

```txt
chef-de-geladeira/
  public/
    app.js
    fridge-chef.svg
    index.html
    styles.css
  .env.example
  .gitignore
  package.json
  README.md
  server.js
```

## Observacoes para entrega

- Envie o projeto em um repositorio publico no GitHub.
- Nao envie o arquivo `.env`.
- Cada integrante deve enviar o link do repositorio conforme as regras da atividade.
- Antes de entregar, teste com uma chave real do OpenRouter.
