import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function normalizeIngredients(input) {
  const rawItems = Array.isArray(input)
    ? input
    : String(input || '')
        .split(/[\n,;]/)
        .map((item) => item.trim());

  const unique = [];
  const seen = new Set();

  for (const item of rawItems) {
    const normalized = String(item || '').trim().replace(/\s+/g, ' ');
    const key = normalized.toLocaleLowerCase('pt-BR');

    if (normalized && !seen.has(key)) {
      unique.push(normalized);
      seen.add(key);
    }
  }

  return unique;
}

function validateIngredients(ingredients) {
  if (ingredients.length < 3 || ingredients.length > 5) {
    return {
      valid: false,
      message: 'Informe de 3 a 5 ingredientes diferentes.'
    };
  }

  const tooLong = ingredients.find((ingredient) => ingredient.length > 40);
  if (tooLong) {
    return {
      valid: false,
      message: `O ingrediente "${tooLong}" está muito longo. Use nomes curtos, como "tomate" ou "arroz cozido".`
    };
  }

  return { valid: true };
}

function buildMessages(ingredients) {
  const schemaDescription = {
    nome_receita: 'string',
    conceito: 'string curta explicando a ideia criativa da receita',
    tempo_estimado_minutos: 'number',
    nivel_dificuldade: 'facil | medio | dificil',
    porcoes: 'number',
    ingredientes_usados: [
      {
        nome: 'string exatamente igual a um ingrediente informado pelo usuario',
        quantidade_sugerida: 'string'
      }
    ],
    modo_preparo: [
      {
        ordem: 'number',
        instrucao: 'string'
      }
    ],
    dicas_servir: ['string sem sugerir ingredientes, acompanhamentos, temperos ou itens fora da lista'],
    validacao: {
      usa_apenas_ingredientes_informados: true,
      ingredientes_informados: ingredients,
      ingredientes_nao_utilizados: ['string']
    }
  };

  return [
    {
      role: 'system',
      content: [
        'Voce e o Chef de Geladeira, uma IA que cria receitas com sobras de geladeira.',
        'Responda exclusivamente com um objeto JSON valido.',
        'Nao use Markdown, listas em texto puro, comentarios, cercas de codigo ou explicacoes fora do JSON.',
        'Use todos os ingredientes enviados pelo usuario e nao use nenhum ingrediente fora da lista.',
        'Nao adicione sal, agua, oleo, temperos, ervas, molhos, acompanhamentos ou qualquer outro item se eles nao estiverem na lista.',
        'As dicas de servir tambem nao podem sugerir ingredientes, acompanhamentos, saladas, ervas, molhos ou itens extras.',
        'Se algum ingrediente nao combinar, ainda crie uma receita possivel usando somente a lista recebida.',
        'Mantenha o texto em portugues do Brasil.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        tarefa: 'Criar uma receita criativa usando somente estes ingredientes.',
        ingredientes: ingredients,
        formato_obrigatorio: schemaDescription
      })
    }
  ];
}

function parseJsonFromModel(content) {
  if (content && typeof content === 'object') {
    return content;
  }

  if (typeof content !== 'string') {
    throw new Error('A IA nao retornou texto JSON.');
  }

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('A IA nao retornou um objeto JSON.');
    }

    return JSON.parse(match[0]);
  }
}

function ensureRecipeUsesOnlyInput(recipe, ingredients) {
  const allowed = new Set(ingredients.map((item) => item.toLocaleLowerCase('pt-BR')));
  const used = Array.isArray(recipe.ingredientes_usados) ? recipe.ingredientes_usados : [];
  const usedNames = used.map((item) => String(item?.nome || '').trim());
  const invalid = usedNames.filter((name) => name && !allowed.has(name.toLocaleLowerCase('pt-BR')));
  const usedSet = new Set(usedNames.map((name) => name.toLocaleLowerCase('pt-BR')));
  const unused = ingredients.filter((ingredient) => !usedSet.has(ingredient.toLocaleLowerCase('pt-BR')));

  if (!recipe.validacao || typeof recipe.validacao !== 'object') {
    recipe.validacao = {};
  }

  recipe.dicas_servir = [
    'Sirva logo apos o preparo para preservar a textura.',
    'Ajuste as quantidades apenas entre os ingredientes informados.'
  ];
  recipe.validacao.usa_apenas_ingredientes_informados = invalid.length === 0;
  recipe.validacao.usa_todos_ingredientes_informados = unused.length === 0;
  recipe.validacao.ingredientes_informados = ingredients;
  recipe.validacao.ingredientes_nao_utilizados = unused;
  recipe.validacao.ingredientes_fora_da_lista = invalid;

  return recipe;
}

async function readOpenRouterPayload(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function requestOpenRouterRecipe(ingredients, useJsonMode = true) {
  const body = {
    model: OPENROUTER_MODEL,
    messages: buildMessages(ingredients),
    temperature: 0.75
  };

  if (useJsonMode) {
    body.response_format = {
      type: 'json_object'
    };
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Chef de Geladeira'
    },
    body: JSON.stringify(body)
  });

  return {
    response,
    payload: await readOpenRouterPayload(response),
    jsonMode: useJsonMode
  };
}

app.post('/api/receita', async (req, res) => {
  const ingredients = normalizeIngredients(req.body?.ingredientes);
  const validation = validateIngredients(ingredients);

  if (!validation.valid) {
    return res.status(400).json({
      erro: true,
      mensagem: validation.message
    });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      erro: true,
      mensagem: 'Configure a variavel OPENROUTER_API_KEY no arquivo .env antes de gerar receitas.'
    });
  }

  try {
    let openRouterResult = await requestOpenRouterRecipe(ingredients, true);

    if (!openRouterResult.response.ok && [400, 422].includes(openRouterResult.response.status)) {
      openRouterResult = await requestOpenRouterRecipe(ingredients, false);
    }

    const { response: openRouterResponse, payload, jsonMode } = openRouterResult;

    if (!openRouterResponse.ok) {
      return res.status(openRouterResponse.status).json({
        erro: true,
        mensagem: 'A chamada ao OpenRouter falhou.',
        detalhes: payload
      });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({
        erro: true,
        mensagem: 'O OpenRouter respondeu sem conteudo de receita.',
        detalhes: payload
      });
    }

    const recipe = ensureRecipeUsesOnlyInput(parseJsonFromModel(content), ingredients);

    return res.json({
      erro: false,
      modelo: OPENROUTER_MODEL,
      json_mode: jsonMode ? 'response_format' : 'prompt',
      receita: recipe
    });
  } catch (error) {
    return res.status(500).json({
      erro: true,
      mensagem: 'Nao foi possivel gerar a receita.',
      detalhes: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Chef de Geladeira rodando em http://localhost:${PORT}`);
});
