# Documentação Técnica: Calendar Component

**Contexto:** Este documento descreve a solução técnica definitiva para o renderizador de calendário (`CalendarGrid.tsx`), visando prevenir a regressão de bugs visuais como o corte de eventos (clipping) e desalinhamento.

## O Problema "Event Clipping"

Em implementações ingênuas de calendário baseadas em CSS Grid ou Flexbox, é comum colocar os eventos como filhos diretos da célula do dia (`div` do dia). Isso causa dois problemas graves:

1. **Corte (Overflow):** Se o evento é mais largo que o dia (span > 1), ele é cortado se a célula tiver `overflow: hidden` ou se o contexto de empilhamento (stacking context) estiver errado.
2. **Layout Shift:** O evento empurra o conteúdo da célula, quebrando o alinhamento da grid.

## A Solução: Arquitetura de 3 Camadas (Sibling Layers)

Para resolver isso, adotamos uma arquitetura onde o Grid Visual, os Eventos e a Interação são **irmãos (siblings)** posicionados via CSS Absolute sobrepostos, e não pais-filhos.

```tsx
<div className="js-week-row relative ...">
  {/* CAMADA 1: GRID DE FUNDO (Background) */}
  {/* Responsabilidade: Desenhar bordas, dia do mês, cores de fundo */}
  {/* Z-Index: 0 */}
  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none z-0">
     {days.map(day => <CellBorder />)}
  </div>

  {/* CAMADA 2: INTERAÇÃO (Drop Zones) */}
  {/* Responsabilidade: Capturar eventos de Drop (dnd-kit) */}
  {/* Z-Index: 10 */}
  <div className="absolute inset-0 grid grid-cols-7 z-10">
     {days.map(day => <DroppableZone />)}
  </div>

  {/* CAMADA 3: EVENTOS (Events Layer) */}
  {/* Responsabilidade: Renderizar os cards de evento */}
  {/* Z-Index: 20 */}
  {/* IMPORTANTE: pointer-events-none no container, pointer-events-auto nos eventos. */}
  <div className="absolute inset-0 grid grid-cols-7 pt-8 z-20 pointer-events-none">
     {events.map(evt => (
        <div 
          className="pointer-events-auto ..."
          style={{ 
             gridColumnStart: start, 
             gridColumnEnd: `span ${duration}` 
          }} 
        />
     ))}
  </div>
</div>
```

## Regras de Implementação (Do's & Don'ts)

### ✅ FAZER

1. **Use `overflow-visible` nas linhas da semana.** Os eventos precisam "vazar" visualmente se necessário (embora o grid deva conter).
2. **Calcule posições via Grid Columns.** Use `gridColumnStart` e `span` baseado na diferença de dias (`differenceInCalendarDays`).
3. **Handle Z-Index.** Certifique-se de que a Camada 3 > Camada 2 > Camada 1.

### ❌ NÃO FAZER

1. **NUNCA renderize `CalendarEvent` dentro do loop `days.map`.** Isso acopla o evento à célula e causa corte. O evento deve estar no loop `events.map` na Camada 3.
2. **NÃO use larguras fixas em pixels (px) para eventos salvos.** Use o Grid CSS para que o navegador lide com a responsividade (largura %). Pixels são permitidos apenas para "Ghost Events" durante o arrasto se necessário.
3. **NÃO esqueça `pointer-events-none`.** A camada de eventos (container) deve ser transparente ao mouse para não bloquear o Drop na Camada 2 que está abaixo dela (nos espaços vazios). Apenas o *card do evento* deve ter `pointer-events-auto`.

## Resize Logic (Ghost State)

Para o redimensionamento suave:

1. Ao iniciar o resize, capturamos o evento corrente.
2. Criamos um "Ghost State" visual que responde ao movimento do mouse.
3. O evento original é temporariamente ocultado ou diminuído a opacidade.
4. Ao soltar (drop), calculamos a nova data baseada na largura visual ou célula de destino e atualizamos o banco.
