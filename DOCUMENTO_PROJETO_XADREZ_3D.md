# Chess 3D Royale — Documento de Design, Arquitetura Técnica e Prompt Mestre

> **Objetivo:** Especificação completa para o desenvolvimento e evolução de um jogo de xadrez 3D excepcional na Web, com visualização tridimensional fotorrealista (PBR), multiplayer online em tempo real via Firebase, inteligência artificial escalonável em 5 níveis de dificuldade e um Estúdio de Personalização 3D peça por peça.

---

## 1. Visão Geral e Direção de Arte 3D

O **Chess 3D Royale** transforma o xadrez tradicional em uma experiência tátil e cinematográfica diretamente no navegador, sem necessidade de plugins ou downloads de modelos pesados.

### 1.1 Experiência Visual e Iluminação
- **Motor Gráfico:** WebGL via `Three.js` com `ACESFilmicToneMapping`, sombras suaves (`PCFSoftShadowMap`) e ambiente HDRI procedural (`RoomEnvironment` via `PMREMGenerator`), garantindo reflexos realistas em peças metálicas, mármore polido e cristal.
- **Tabuleiro Esculpido:** Moldura chanfrada com coordenadas alfanuméricas (`A–H`, `1–8`) integradas na borda e 64 casas com texturas procedurais/PBR alternáveis em 5 temas:
  1. **Madeira Nobre Clássica** (Nogueira & Bordo)
  2. **Mármore Imperial** (Carrara & Nero Marquina)
  3. **Cyber Neon** (Grafite fosco com filetes ciano/magenta emissivos)
  4. **Cristal & Safira** (Vidro translúcido sobre base escura reflexiva)
  5. **Pedra Medieval** (Ardósia e calcário desgastado)
- **Dinâmica de Jogo e Feedback 3D:**
  - Animação parabólica no eixo Y para deslocamento das peças (cavalos descrevem um arco elevado sobre outras peças).
  - Explosão de partículas 3D estilizadas na cor da peça capturada.
  - Indicadores espaciais no tabuleiro: anel dourado de seleção, esferas esmeralda flutuantes para casas válidas, anéis carmesim pulsantes para capturas possíveis, realce de último lance e aura vermelha pulsante sob o Rei em xeque.
  - Câmera orbital suave (`OrbitControls`) com atalhos cinemáticos (Vista Brancas, Vista Pretas, Visão Tática 2.5D e Rotação Automática em modo local).

### 1.2 Áudio Procedural (Web Audio API)
Sem dependência de arquivos de áudio externos: síntese em tempo real de impactos de madeira/mármore para movimentos, estalo grave em capturas, acorde brilhante em promoções, pulso de tensão para xeque e fanfarra de encerramento.

---

## 2. Sistema de Personalização Individual de Peças 3D

Diferente de jogos comuns que aplicam apenas uma "skin global", o **Estúdio de Peças 3D** permite customizar **cada uma das 6 peças individualmente** (`Rei`, `Dama`, `Torre`, `Bispo`, `Cavalo`, `Peão`) ou aplicar um conjunto unificado, com **preview 3D interativo giratório em tempo real**.

### 2.1 Geometrias Procedurais por Peça e Estilo

Todas as peças são construídas proceduralmente em `THREE.Group` utilizando `LatheGeometry`, `ExtrudeGeometry`, `CylinderGeometry`, `TorusGeometry` e malhas compostas, permitindo mistura livre (ex.: *Rei Medieval + Cavalos Futuristas + Peões Minimalistas*):

| Peça | Clássico Staunton | Futurista / Cyber | Minimalista Bauhaus | Medieval Fortaleza |
| :--- | :--- | :--- | :--- | :--- |
| **Peão (`p`)** | Base torneada, colarinho duplo e esfera polida no topo | Corpo hexagonal afilado com anel flutuante neon e núcleo suspenso | Cone truncado puro com esfera geométrica destacada | Escudo cilíndrico robusto e elmo templário com visor |
| **Torre (`r`)** | Torre cilíndrica clássica com 6 ameias esculpidas | Monólito octogonal com 4 pilares energizados e núcleo brilhante | Cilindro arquitetônico com recorte superior limpo em cruz | Bastilha pesada com barbacã chanfrada e ameias largas |
| **Cavalo (`n`)** | Cabeça e crina esculpidas via `ExtrudeGeometry` sobre pedestal torneado | Perfil cyber angular estilo mecha com visor luminoso | Prisma inclinado facetado com crista minimalista | Corcel blindado (barding) com placa frontal e crina geométrica |
| **Bispo (`b`)** | Corpo esguio, colar alto, mitra com corte diagonal e orbe superior | Obelisco prismático com anel orbital inclinado emissivo | Cone alongado seccionado por anel metálico | Báculo gótico com mitra pontiaguda e cruz entalhada |
| **Dama (`q`)** | Coroa florida com pontas esféricas e esfera central elevada | Tiara de 6 prismas flutuantes envolvendo cristal de energia | Coluna elegante coroada por aro metálico e joia esférica | Coroa mural fortificada com torres em miniatura |
| **Rei (`k`)** | Corpo imponente, dupla coroa e cruz imperial no topo | Núcleo reator levitando dentro de coroa prismática e halo | Monólito alto com disco horizontal e cubo/cruz pura | Coroa de ferro larga com ponta de espada / cruz templária |

### 2.2 Parâmetros PBR Customizáveis por Peça
Para cada tipo de peça (`p`, `r`, `n`, `b`, `q`, `k`), o jogador controla:
- **Estilo Geométrico:** `staunton` | `futuristic` | `minimalist` | `medieval`
- **Preset de Material PBR:** Mármore Imperial, Ouro & Prata Real, Cristal Translúcido, Madeira Nobre, Obsidiana & Rubi, Cyber Neon
- **Cor das Brancas / Cor das Pretas:** Seletores RGB individuais
- **Cor de Detalhe / Acento:** Aplicada a colares, coroas, núcleos de energia e filetes
- **Propriedades Físicas (`MeshPhysicalMaterial`):**
  - `metalness` (`0.00` – `1.00`)
  - `roughness` (`0.00` – `1.00`)
  - `emissiveIntensity` (`0.00` – `2.00` para brilho neon)
  - `transmission` / `clearcoat` (vidro/cristal e verniz)
- **Escala de Altura:** `0.80x` a `1.35x` para proporções dramáticas ou compactas.

---

## 3. Arquitetura de Inteligência Artificial (Bot em 5 Níveis)

O motor de IA opera sobre as regras oficiais (via `chess.js`) de forma assíncrona para manter a taxa de quadros 3D sempre fluida a 60 FPS.

### 3.1 Níveis de Dificuldade
1. **Nível 1 — Aprendiz (~600 ELO):** Seleção ponderada com forte aleatoriedade controlada; reconhece capturas imediatas evidentes, mas comete erros táticos naturais para iniciantes.
2. **Nível 2 — Casual (~1000 ELO):** Busca Minimax em profundidade 2 usando balanço material e tabelas posicionais básicas (*Piece-Square Tables*).
3. **Nível 3 — Clube (~1400 ELO):** Poda Alfa-Beta em profundidade 3 com ordenação de capturas **MVV-LVA** (*Most Valuable Victim – Least Valuable Attacker*) e livro de aberturas clássico.
4. **Nível 4 — Mestre (~1800 ELO):** Profundidade 4 com **Quiescence Search** (elimina o efeito horizonte em trocas táticas), avaliação de par de bispos, segurança do rei e controle do centro.
5. **Nível 5 — Grande Mestre (~2100+ ELO):**
   - **Iterative Deepening** com orçamento de tempo inteligente (~900 ms).
   - **Tabela de Transposição (Zobrist/FEN Hash)** para reaproveitar subárvores já calculadas.
   - **Heurística de Killer Moves** + **MVV-LVA** para máxima eficiência da poda Alfa-Beta.
   - Avaliação refinada de fase do jogo (Meio-jogo vs. Final para atividade do Rei), estrutura de peões (dobrados/isolados/passados) e mobilidade.

### 3.2 Assistência Tática em Tempo Real
- **Barra de Avaliação (Eval Bar):** Exibe continuamente a vantagem posicional/material em peões (ex.: `+1.8`, `-0.5`, `#3`).
- **Botão "Dica da IA":** Calcula o melhor lance sugerido para o turno atual e destaca origem e destino diretamente no tabuleiro 3D.

---

## 4. Arquitetura Multiplayer Online com Firebase

### 4.1 Estratégia Híbrida (Nuvem Firebase + Demo Multi-Aba Instantânea)
- **Firebase Realtime Database (Nuvem Global):** O jogador pode colar seu `firebaseConfig` (JSON ou snippet JS do Firebase Console) diretamente na interface, sem recompilar código, ou defini-lo via variáveis de ambiente (`VITE_FIREBASE_*`).
- **Fallback Transparente (`BroadcastChannel` + `localStorage`):** Quando não há credenciais Firebase conectadas, o sistema opera em modo **Demo Multi-Aba**, permitindo criar salas, copiar links de convite (`?room=XXXXXX`) e jogar em tempo real entre duas abas do mesmo navegador usando exatamente o mesmo protocolo de eventos.

### 4.2 Modelo de Dados da Sala (`rooms/{roomId}`)
```json
{
  "roomId": "K7M9P2",
  "status": "playing",
  "createdAt": 1763648700000,
  "timeControl": { "initialSeconds": 600, "incrementSeconds": 0 },
  "white": {
    "uid": "player_abc123",
    "name": "Jogador 1",
    "connected": true,
    "timeLeftMs": 584200,
    "pieceCustomization": { "k": { "style": "medieval" }, "n": { "style": "futuristic" } }
  },
  "black": {
    "uid": "player_xyz789",
    "name": "Jogador 2",
    "connected": true,
    "timeLeftMs": 591000,
    "pieceCustomization": {}
  },
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "turn": "b",
  "lastMove": { "from": "e2", "to": "e4", "san": "e4" },
  "moves": ["e4"],
  "result": null,
  "drawOfferBy": null,
  "rematchVotes": { "white": false, "black": false },
  "chat": [
    { "sender": "Jogador 1", "text": "Bom jogo!", "timestamp": 1763648712000 }
  ]
}
```

### 4.3 Funcionalidades Sociais e de Partida Online
- Lobby de salas públicas abertas + entrada direta por código ou URL (`?room=XXXXXX`).
- Relógios sincronizados por timestamp de servidor/lance.
- Mini-chat e reações rápidas em um clique (`👏`, `🔥`, `🤔`, `🤝`, `⚡`).
- Oferta de empate, desistência e solicitação de revanche automática com inversão de cores.
- Sincronização opcional da estética das peças customizadas entre os oponentes.

---

## 6. Expansão 2.0 (+200%) Implementada
- **Direção Cinematográfica & Física de Xeque-Mate:** Queda do Rei derrotado a `75°` com onda de choque dupla e câmera dramática (`triggerCheckmateFall`), partículas ambientais por tema (`ambientParticles`), altar dourado de *Rei da Colina* e **Mapa de Ameaças 3D** em tempo real.
- **Mestres IA com Personalidades & Classificador Tático:** 5 personalidades (Sofia, Lucas, Viktor, Mikhail e Aegis GM) com reações no chat, selos de qualidade por lance (`!!`, `!`, `✓`, `?!`, `??`) e **Gráfico Interativo de Vantagem** para navegação no histórico.
- **Desafios Táticos 3D & Variantes:** Modo de **Puzzles Táticos 3D**, variantes **Rei da Colina (KOTH)** e **3-Xeques**, além de **Partida Rápida Online (Matchmaking automático)** em `/api/rooms`.
- **Feedback Sensorial Mobile & Exportação:** Vibração háptica (`navigator.vibrate`), tique-taque de relógio abaixo de 20s e exportação PGN/FEN em 1 clique.

---

## 5. Prompt Mestre de Desenvolvimento (Texto Completo Reutilizável)

> Abaixo está um **Prompt Mestre** pronto para uso em apresentações, documentações ou geração assistida por IA:

```text
Atue como um Arquiteto de Software Sênior e Engenheiro de Gráficos 3D WebGL. Desenvolva um jogo de xadrez 3D de nível profissional ("Chess 3D Royale") utilizando Vite, Three.js, chess.js e Firebase Realtime Database.

REQUISITOS DE EXPERIÊNCIA E ARQUITETURA:

1. ENGINE GRÁFICA 3D (Three.js):
   - Renderização PBR com ACESFilmicToneMapping, sombras suaves (PCFSoftShadowMap) e iluminação HDRI procedural (RoomEnvironment).
   - Tabuleiro 3D esculpido com moldura chanfrada, coordenadas A-H / 1-8 e 5 temas selecionáveis (Madeira Clássica, Mármore Imperial, Cyber Neon, Cristal e Pedra Medieval).
   - Animação parabólica fluida dos movimentos (cavalos saltando em arco mais alto), partículas 3D em capturas e marcadores espaciais para seleção, lances válidos, capturas, último lance e alerta pulsante de xeque.
   - Câmera orbital suave com presets rápidos (Brancas, Pretas, Topo 2.5D e Giro Automático).

2. ESTÚDIO DE PERSONALIZAÇÃO INDIVIDUAL DE PEÇAS 3D:
   - Construa geradores procedurais independentes para cada uma das 6 peças (Rei, Dama, Torre, Bispo, Cavalo, Peão) em 4 estilos arquitetônicos distintos: Clássico Staunton, Futurista/Cyber, Minimalista Bauhaus e Medieval Fortaleza.
   - Permita ao usuário escolher um estilo global OU misturar estilos e materiais peça por peça (ex: Rei Medieval + Cavalos Futuristas + Peões Cristal).
   - Exponha controles PBR em tempo real por tipo de peça: preset de material, cor das Brancas, cor das Pretas, cor de destaque/emissão, metalness, roughness, intensidade neon e escala de altura, com um mini-canvas 3D de preview giratório em tempo real e persistência em localStorage.

3. INTELIGÊNCIA ARTIFICIAL EM 5 NÍVEIS:
   - Implemente um motor assíncrono com Livro de Aberturas, Piece-Square Tables (Meio-jogo e Final), Poda Alfa-Beta, ordenação MVV-LVA, Killer Moves, Quiescence Search, Tabela de Transposição e Iterative Deepening.
   - Disponibilize 5 níveis calibrados: Aprendiz (~600), Casual (~1000), Clube (~1400), Mestre (~1800) e Grande Mestre (~2100+).
   - Alimente uma Barra de Avaliação (Eval Bar) contínua e um botão "Dica da IA" que destaca o melhor lance diretamente no tabuleiro 3D.

4. MULTIPLAYER ONLINE COM FIREBASE + MODO DEMO:
   - Integre Firebase Realtime Database para criação de salas com código único, link de convite (?room=XXXXXX), lobby de salas abertas, sincronização de FEN/SAN, relógio digital com incremento, oferta de empate, desistência, revanche e mini-chat com reações.
   - Crie um modal na interface onde o usuário possa colar o firebaseConfig (JSON ou snippet JS) a qualquer momento para ativar a nuvem.
   - Quando nenhuma credencial Firebase estiver configurada, ative automaticamente um fallback multi-aba via BroadcastChannel/localStorage com a mesma API, garantindo testes imediatos.

5. INTERFACE E ÁUDIO:
   - UI glassmorphism escura e responsiva com HUD de jogadores, peças capturadas, vantagem material, histórico algébrico em duas colunas e sintetizador de áudio procedural via Web Audio API sem dependências externas.
```
