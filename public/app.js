const form = document.querySelector('#ingredient-form');
const textarea = document.querySelector('#ingredients');
const ingredientCount = document.querySelector('#ingredient-count');
const submitButton = document.querySelector('#submit-button');
const statusDot = document.querySelector('#status-dot');
const statusText = document.querySelector('#status-text');
const recipeView = document.querySelector('#recipe-view');
const emptyJson = document.querySelector('#empty-json');
const recipeTitle = document.querySelector('#recipe-title');
const recipeConcept = document.querySelector('#recipe-concept');
const recipeTime = document.querySelector('#recipe-time');
const recipeLevel = document.querySelector('#recipe-level');
const recipeServings = document.querySelector('#recipe-servings');
const usedIngredients = document.querySelector('#used-ingredients');
const steps = document.querySelector('#steps');
const jsonOutput = document.querySelector('#json-output');

function parseIngredients(value) {
  const seen = new Set();

  return value
    .split(/[\n,;]/)
    .map((item) => item.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase('pt-BR');
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function setStatus(type, text) {
  statusDot.dataset.status = type;
  statusText.textContent = text;
}

function updateCount() {
  const total = parseIngredients(textarea.value).length;
  ingredientCount.textContent = `${total} ${total === 1 ? 'ingrediente' : 'ingredientes'}`;
}

function fillList(element, items, render) {
  element.innerHTML = '';

  for (const item of items || []) {
    const li = document.createElement('li');
    li.textContent = render(item);
    element.append(li);
  }
}

function renderRecipe(payload) {
  const recipe = payload.receita;

  recipeTitle.textContent = recipe.nome_receita || 'Receita criada';
  recipeConcept.textContent = recipe.conceito || '';
  recipeTime.textContent = `${recipe.tempo_estimado_minutos || '?'} min`;
  recipeLevel.textContent = recipe.nivel_dificuldade || 'nivel nao informado';
  recipeServings.textContent = `${recipe.porcoes || '?'} porcoes`;

  fillList(
    usedIngredients,
    recipe.ingredientes_usados,
    (item) => `${item.nome}: ${item.quantidade_sugerida || 'quantidade livre'}`
  );

  fillList(steps, recipe.modo_preparo, (item) => item.instrucao);

  jsonOutput.textContent = JSON.stringify(payload, null, 2);
  emptyJson.hidden = true;
  recipeView.hidden = false;
}

async function generateRecipe(ingredients) {
  const response = await fetch('/api/receita', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ingredientes: ingredients })
  });

  const payload = await response.json();

  if (!response.ok || payload.erro) {
    throw new Error(payload.mensagem || 'Erro ao gerar receita.');
  }

  return payload;
}

textarea.addEventListener('input', updateCount);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const ingredients = parseIngredients(textarea.value);

  if (ingredients.length < 3 || ingredients.length > 5) {
    setStatus('error', 'Informe de 3 a 5 ingredientes diferentes.');
    return;
  }

  submitButton.disabled = true;
  setStatus('loading', 'Gerando receita em JSON...');

  try {
    const payload = await generateRecipe(ingredients);
    renderRecipe(payload);
    setStatus('success', 'Receita gerada com JSON estruturado');
  } catch (error) {
    recipeView.hidden = true;
    emptyJson.hidden = false;
    emptyJson.textContent = JSON.stringify(
      {
        erro: true,
        mensagem: error.message
      },
      null,
      2
    );
    setStatus('error', error.message);
  } finally {
    submitButton.disabled = false;
  }
});

updateCount();
