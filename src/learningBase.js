/**
 * Academia de Xadrez 3D — Base completa de estudo teórico e prático.
 * Contém 6 trilhas pedagógicas (46 lições multi-lances interativas),
 * Enciclopédia Completa de Conceitos e Detector de Aberturas ao vivo.
 */

export const LEARNING_TRACKS = [
  {
    id: 'fundamentals',
    title: 'Fundamentos & Regras Especiais',
    level: 'Iniciante',
    description: 'Domine o centro, desenvolvimento, roques, en passant, promoção e subpromoção.',
  },
  {
    id: 'openings',
    title: 'Aberturas & Defesas Clássicas',
    level: 'Essencial',
    description: 'Aprenda os primeiros lances das principais aberturas de Brancas e Pretas.',
  },
  {
    id: 'traps',
    title: 'Armadilhas & Refutações',
    level: 'Tático',
    description: 'Evite golpes famosos na abertura e puna erros precoces do adversário.',
  },
  {
    id: 'tactics',
    title: 'Golpes Táticos Fundamentais',
    level: 'Intermediário',
    description: 'Garfos, cravadas, espetos, ataques descobertos, desvios e sacrifícios.',
  },
  {
    id: 'checkmates',
    title: 'Padrões Clássicos de Xeque-Mate',
    level: 'Avançado',
    description: 'Mate sufocado, Anastásia, Ópera, Boden, Árabe, Escadinha e Corredor.',
  },
  {
    id: 'endgames',
    title: 'Finais & Estratégia Posicional',
    level: 'Mestre',
    description: 'Oposição, Regra do Quadrado, Lucena, Philidor, Outposts e Torre na 7ª.',
  },
];

export const LEARNING_LESSONS = [
  // ==================== 1. FUNDAMENTOS & REGRAS ESPECIAIS (7) ====================
  {
    id: 'fund_center_control',
    trackId: 'fundamentals',
    title: '1. Domínio do Centro (e4 / d4)',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    keyConcept: 'As casas centrais (e4, d4, e5, d5) são o coração do tabuleiro. Peões centrais abrem caminhos para Bispos e a Dama.',
    intro: 'Inicie ocupando o centro com o peão do Rei ou da Dama e continue desenvolvendo suas peças menores.',
    steps: [
      {
        expected: ['e4', 'd4'],
        reply: 'e5',
        explain: 'Excelente! Avançar um peão central dois passos conquista espaço e libera seu Bispo e sua Dama.',
        hint: 'Mova o peão da coluna "e" ou "d" duas casas para frente (e4 ou d4).',
      },
      {
        expected: ['Nf3'],
        reply: 'Nc6',
        explain: 'Cavalo em f3 desenvolve uma peça menor em direção ao centro e já pressiona o peão inimigo de e5.',
        hint: 'Desenvolva o Cavalo do flanco do Rei atacando e5.',
      },
      {
        expected: ['Bc4', 'Bb5'],
        explain: 'Perfeito! Com peão no centro, Cavalo e Bispo ativos, você cumpriu os três primeiros passos de uma abertura sólida.',
        hint: 'Desenvolva o Bispo de casas claras apontando para o centro ou para c6 (Bc4 ou Bb5).',
      },
    ],
  },
  {
    id: 'fund_fast_development',
    trackId: 'fundamentals',
    title: '2. Desenvolvimento antes de Ataques',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    keyConcept: 'Não mova a mesma peça duas vezes na abertura e não saia cedo demais com a Dama; coloque Bispos e Cavalos em jogo.',
    intro: 'Desenvolva o restante das suas peças menores e prepare a segurança do Rei.',
    steps: [
      {
        expected: ['Bc4', 'Bb5', 'Nc3'],
        reply: 'Nf6',
        explain: 'Bom lance! Cada nova peça menor desenvolvida aumenta sua força coordenada no centro.',
        hint: 'Coloque o Bispo de f1 ou o Cavalo de b1 em jogo.',
      },
      {
        expected: ['O-O', 'Nc3', 'd3'],
        explain: 'Ótima coordenação! Manter o Rei seguro e as peças menores ativas evita armadilhas rápidas.',
        hint: 'Você pode rocar curto (O-O), proteger e4 com d3 ou desenvolver o outro Cavalo (Nc3).',
      },
    ],
  },
  {
    id: 'fund_castle_short',
    trackId: 'fundamentals',
    title: '3. Movimento Especial: Roque Curto (O-O)',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    keyConcept: 'O roque é o único lance em que duas peças se movem juntas: o Rei anda 2 casas em direção à Torre e a Torre salta para o outro lado.',
    intro: 'Seu Rei ainda está no centro aberto! Proteja-o executando o Roque Curto.',
    steps: [
      {
        expected: ['O-O'],
        explain: 'Perfeito! Para fazer o roque no tabuleiro, basta mover o Rei duas casas para g1 (ou clicar no Rei e depois em g1).',
        hint: 'Selecione seu Rei em e1 e leve-o até g1.',
      },
    ],
  },
  {
    id: 'fund_castle_long',
    trackId: 'fundamentals',
    title: '4. Movimento Especial: Roque Grande (O-O-O)',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: 'r2qk2r/ppp2ppp/2npbn2/4p3/4P3/2NPB3/PPPQ1PPP/R3K2R w KQkq - 2 8',
    keyConcept: 'O Roque Grande coloca o Rei em segurança na ala da Dama (c1) e traz a Torre imediatamente para a coluna central d1.',
    intro: 'O caminho entre o Rei e a Torre de a1 está livre. Faça o Roque Grande (O-O-O) e ative a Torre na coluna d.',
    steps: [
      {
        expected: ['O-O-O'],
        explain: 'Excelente! O Rei moveu de e1 para c1 e a Torre foi automaticamente para d1, apontando para a Dama adversária.',
        hint: 'Selecione o Rei em e1 e clique na casa c1.',
      },
    ],
  },
  {
    id: 'fund_en_passant',
    trackId: 'fundamentals',
    title: '5. Captura Especial: En Passant',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
    keyConcept: 'Quando um peão avança 2 casas e para ao lado de um peão inimigo na 5ª fileira (ou 4ª das Pretas), o oponente pode capturá-lo "de passagem" apenas no lance imediato.',
    intro: 'As Pretas acabaram de jogar ...d7-d5 tentando passar direto pelo seu peão em e5. Capture En Passant!',
    steps: [
      {
        expected: ['exd6'],
        explain: 'Brilhante! O peão branco captura em d6 e remove o peão preto de d5. Se não capturar agora, perde esse direito no próximo turno.',
        hint: 'Mova o peão de e5 na diagonal para a casa vazia d6.',
      },
    ],
  },
  {
    id: 'fund_promotion_queen',
    trackId: 'fundamentals',
    title: '6. Promoção de Peão',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: '6k1/4P3/6K1/8/8/8/8/8 w - - 0 1',
    keyConcept: 'Ao atingir a última fileira, todo peão obrigatoriamente promove para Dama, Torre, Bispo ou Cavalo — mesmo que você já tenha uma Dama no tabuleiro.',
    intro: 'Avance o peão até e8 e escolha a Dama para dar xeque-mate imediato!',
    steps: [
      {
        expected: ['e8=Q#'],
        explain: 'Promoção com xeque-mate! A Dama recém-nascida cobre toda a 8ª fileira e o Rei branco protege as casas de fuga em f7/g7.',
        hint: 'Leve o peão de e7 até e8 e selecione Dama.',
      },
    ],
  },
  {
    id: 'fund_underpromotion',
    trackId: 'fundamentals',
    title: '7. Subpromoção Tática (Cavalo)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '8/2q1P1k1/8/6pp/8/8/6PP/6K1 w - - 0 1',
    keyConcept: 'Às vezes promover para Dama permite trocas ou até afogamento. Promover para Cavalo dá um garfo imediato e ganha material decisivo.',
    intro: 'Promova em e8 escolhendo Cavalo para dar um ataque duplo no Rei e na Dama ao mesmo tempo!',
    steps: [
      {
        expected: ['e8=N+'],
        reply: 'Kf7',
        explain: 'Genial! Promover para Cavalo em e8 deu Xeque no Rei em g7 e atacou a Dama em c7 ao mesmo tempo!',
        hint: 'Mova o peão de e7 até e8 e selecione Cavalo para dar um garfo no Rei e na Dama.',
      },
      {
        expected: ['Nxc7'],
        explain: 'Você capturou a Dama adversária graças à subpromoção para Cavalo!',
        hint: 'Capture a Dama preta em c7 com seu novo Cavalo.',
      },
    ],
  },

  // ==================== 2. ABERTURAS & DEFESAS CLÁSSICAS (10) ====================
  {
    id: 'open_italian_game',
    trackId: 'openings',
    title: '8. Abertura Italiana (Giuoco Piano)',
    difficulty: 'Essencial',
    playerColor: 'w',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    keyConcept: 'A Italiana visa o ponto mais fraco das Pretas na abertura: f7 (protegido apenas pelo Rei), além de controlar o centro com c3 e d4.',
    intro: 'As Pretas responderam 3...Bc5. Construa o plano central da Abertura Italiana jogando com precisão.',
    steps: [
      {
        expected: ['O-O', 'c3'],
        reply: 'Nf6',
        explain: 'Ótimo lance! Na Italiana clássica, tanto c3 (preparando d4) quanto O-O são lances principais de alto nível.',
        hint: 'Prepare d4 com c3 ou proteja o Rei com O-O.',
      },
      {
        expected: ['d4', 'c3', 'd3'],
        explain: 'Muito bem! Você assumiu a iniciativa central mantendo todas as peças coordenadas.',
        hint: 'Expanda no centro (d4 ou d3) ou prepare d4 com c3.',
      },
    ],
  },
  {
    id: 'open_fried_liver',
    trackId: 'openings',
    title: '9. Ataque Fegatello (Fígado Frito)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    keyConcept: 'Após 3...Nf6 na Italiana, 4.Ng5 coloca pressão dupla sobre f7 com o Cavalo e o Bispo de c4.',
    intro: 'Inicie o agressivo ataque contra o ponto f7 e puna a defesa natural ...d5.',
    steps: [
      {
        expected: ['Ng5'],
        reply: 'd5',
        explain: 'Cavalo em g5 ataca f7 duas vezes. A resposta principal das Pretas é fechar a diagonal com d5.',
        hint: 'Salte com o Cavalo de f3 para g5 atacando f7.',
      },
      {
        expected: ['exd5'],
        reply: 'Nxd5',
        explain: 'Capturar o peão em d5 abre novamente o caminho. Se as Pretas recapturam com Cxd5 (erro comum!), o sacrifício em f7 é devastador!',
        hint: 'Capture o peão preto em d5 com seu peão de e4.',
      },
      {
        expected: ['Nxf7'],
        explain: 'Sacrifício Fegatello! O Cavalo toma f7 dando garfo em Dama e Torre, forçando o Rei preto a sair ao centro após ...Kxf7 Qf3+!',
        hint: 'Capture em f7 com o Cavalo (Nxf7).',
      },
    ],
  },
  {
    id: 'open_ruy_lopez',
    trackId: 'openings',
    title: '10. Abertura Espanhola (Ruy Lopez)',
    difficulty: 'Essencial',
    playerColor: 'w',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    keyConcept: '3.Bb5 coloca pressão indireta sobre o peão de e5 ao ameaçar trocar o Cavalo que o defende, mantendo forte controle posicional.',
    intro: 'Jogue a abertura mais clássica de campeões mundiais: a Ruy Lopez.',
    steps: [
      {
        expected: ['Bb5'],
        reply: 'a6',
        explain: '3.Bb5! A Defesa Morphy (...a6) questiona imediatamente o seu Bispo.',
        hint: 'Leve o Bispo de f1 até b5 cravando ou pressionando o Cavalo de c6.',
      },
      {
        expected: ['Ba4'],
        reply: 'Nf6',
        explain: 'Recuar para a4 mantém o Bispo vivo na diagonal perigosa rumo a f7. Agora proteja o Rei.',
        hint: 'Recue o Bispo para a4 mantendo a pressão diagonal.',
      },
      {
        expected: ['O-O'],
        explain: 'Perfeito! Roque rápido permite jogar Re1 e c3-d4 na sequência, que é a essência da Espanhola.',
        hint: 'Execute o Roque Curto (O-O).',
      },
    ],
  },
  {
    id: 'open_queens_gambit',
    trackId: 'openings',
    title: '11. Gambito da Dama (1.d4 d5 2.c4)',
    difficulty: 'Essencial',
    playerColor: 'w',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
    keyConcept: 'Oferecer o peão de c4 desafia o peão central preto de d5. Se as Pretas aceitarem (2...dxc4), as Brancas recuperam facilmente com domínio completo do centro.',
    intro: 'Jogue o Gambito da Dama e recupere o centro após a aceitação das Pretas.',
    steps: [
      {
        expected: ['c4'],
        reply: 'dxc4',
        explain: '2.c4! As Pretas capturaram em c4 (Gambito da Dama Aceito).',
        hint: 'Avance o peão da coluna "c" duas casas (c4).',
      },
      {
        expected: ['e3', 'e4', 'Nf3'],
        explain: 'Excelente! 3.e3 (ou 3.e4 / 3.Cf3) libera o Bispo de f1 para recapturar c4 com desenvolvimento limpo.',
        hint: 'Libere a diagonal do Bispo de f1 jogando e3 ou e4 (ou desenvolva Nf3).',
      },
    ],
  },
  {
    id: 'open_london_system',
    trackId: 'openings',
    title: '12. Sistema Londres (Pirâmide Sólida)',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 2 3',
    keyConcept: 'O Sistema Londres forma um triângulo indestrutível de peões em d4-e3-c3 com o Bispo de casas escuras ativo fora da cadeia (em f4).',
    intro: 'Posicione o Bispo em f4 antes de fechar o centro com e3!',
    steps: [
      {
        expected: ['Bf4'],
        reply: 'e6',
        explain: 'Bispo em f4 fora da cadeia de peões! Agora construa o triângulo central.',
        hint: 'Desenvolva o Bispo da Dama para f4.',
      },
      {
        expected: ['e3'],
        reply: 'c5',
        explain: '3.e3 protege d4 e libera o Bispo de f1. Complete a pirâmide sólida sustentando d4 também pelo lado da Dama.',
        hint: 'Mova o peão de e2 para e3.',
      },
      {
        expected: ['c3'],
        explain: 'Pirâmide do Sistema Londres completa! Uma estrutura extremamente sólida para evoluir com segurança.',
        hint: 'Jogue c3 para reforçar d4 contra o ataque em c5.',
      },
    ],
  },
  {
    id: 'open_scotch_game',
    trackId: 'openings',
    title: '13. Abertura Escocesa (3.d4)',
    difficulty: 'Essencial',
    playerColor: 'w',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    keyConcept: 'A Escocesa abre imediatamente o centro no lance 3 (3.d4), evitando longas manobras fechadas e gerando jogo aberto e tático.',
    intro: 'Golpeie o centro imediatamente no terceiro lance.',
    steps: [
      {
        expected: ['d4'],
        reply: 'exd4',
        explain: '3.d4! As Pretas foram praticamente obrigadas a abrir o centro com ...exd4.',
        hint: 'Avance o peão de d2 até d4.',
      },
      {
        expected: ['Nxd4'],
        explain: 'Cavalo centralizado em d4 com amplo raio de ação e desenvolvimento livre dos dois Bispos!',
        hint: 'Recapture o peão em d4 com seu Cavalo.',
      },
    ],
  },
  {
    id: 'open_sicilian_defense',
    trackId: 'openings',
    title: '14. Defesa Siciliana (Pretas — 1.e4 c5)',
    difficulty: 'Essencial',
    playerColor: 'b',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    keyConcept: 'A Defesa Siciliana (1...c5) evita simetria contra 1.e4, luta pelo controle de d4 com um peão lateral e gera contra-ataque na coluna sem-aberta "c".',
    intro: 'Jogue a resposta mais combativa das Pretas contra 1.e4.',
    steps: [
      {
        expected: ['c5'],
        reply: 'Nf3',
        explain: '1...c5! Luta assimétrica imediata pela casa central d4.',
        hint: 'Avance o peão de c7 duas casas (c5).',
      },
      {
        expected: ['d6', 'Nc6', 'e6'],
        reply: 'd4',
        explain: 'Muito bem! Você prepara a Siciliana Clássica/Najdorf. Quando as Brancas abrirem com d4, troque o peão lateral pelo central!',
        hint: 'Jogue um dos três lances principais da Siciliana: d6, Nc6 ou e6.',
      },
      {
        expected: ['cxd4'],
        explain: 'Excelente troca! Você cedeu um peão da ala "c" por um peão central (d4) e abriu a coluna c para sua Torre e Dama.',
        hint: 'Capture o peão branco em d4 com seu peão de c5.',
      },
    ],
  },
  {
    id: 'open_french_defense',
    trackId: 'openings',
    title: '15. Defesa Francesa (Contra-ataque ...c5)',
    difficulty: 'Essencial',
    playerColor: 'b',
    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2',
    keyConcept: 'Após 1.e4 e6 2.d4 d5, se as Brancas avançarem (3.e5), as Pretas devem imediatamente atacar a base da cadeia branca (d4) com ...c5.',
    intro: 'Responda ao avanço 3.e5 atacando imediatamente a base da cadeia de peões branca!',
    steps: [
      {
        expected: ['Nc6', 'c5'],
        reply: 'c3',
        explain: 'Na Francesa, o plano estratégico vital é minar d4 usando ...c5 e ...Nc6.',
        hint: 'Ataque d4 imediatamente com c5 (ou desenvolva Nc6).',
      },
    ],
  },
  {
    id: 'open_caro_kann',
    trackId: 'openings',
    title: '16. Defesa Caro-Kann (1.e4 c6)',
    difficulty: 'Essencial',
    playerColor: 'b',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    keyConcept: 'Diferente da Francesa, a Caro-Kann prepara 2...d5 com 1...c6, mantendo a diagonal livre para o Bispo de c8 sair para f5 ou g4 antes de jogar ...e6.',
    intro: 'Construa a sólida Caro-Kann e desenvolva o Bispo da Dama sem trancá-lo.',
    steps: [
      {
        expected: ['c6'],
        reply: 'd4',
        explain: '1...c6 prepara o apoio perfeito para ocupar o centro em d5.',
        hint: 'Jogue c6.',
      },
      {
        expected: ['d5'],
        reply: 'Nc3',
        explain: 'Agora as Brancas pressionam e4/d5 com Nc3. Troque em e4 para abrir caminho para o seu Bispo de c8!',
        hint: 'Empurre d5 para desafiar e4.',
      },
      {
        expected: ['dxe4'],
        reply: 'Nxe4',
        explain: 'Peão capturado! Agora execute a ideia-chave da Caro-Kann: tire o Bispo de c8 para f5 antes de fechar com e6.',
        hint: 'Capture o peão em e4 com d5.',
      },
      {
        expected: ['Bf5'],
        explain: 'Perfeito! Bispo desenvolvido em f5 fora da cadeia de peões — estrutura clássica de Grande Mestre.',
        hint: 'Coloque o Bispo de c8 em f5 atacando o Cavalo de e4.',
      },
    ],
  },
  {
    id: 'open_kings_indian',
    trackId: 'openings',
    title: '17. Defesa Índia do Rei (Fianqueto)',
    difficulty: 'Intermediário',
    playerColor: 'b',
    fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 0 3',
    keyConcept: 'O Fianqueto do Rei (...g6 + ...Bg7) cria um poderoso Bispo atirando pela grande diagonal escura h8–a1 enquanto o Rei entra em segurança com O-O.',
    intro: 'Complete o fianqueto da Índia do Rei e prepare o contra-ataque central.',
    steps: [
      {
        expected: ['Bg7'],
        reply: 'e4',
        explain: 'Bispo em g7 controlando toda a grande diagonal escura. Impedindo que o peão de d6 fique atrasado, segure e5 com d6!',
        hint: 'Coloque o Bispo de f8 em g7.',
      },
      {
        expected: ['d6'],
        reply: 'Nf3',
        explain: 'Agora o Rei pode rocar tranquilo antes de explodir o centro com ...e5 ou ...c5.',
        hint: 'Jogue d6 preparando ...e5 e protegendo seu Bispo/Cavalo.',
      },
      {
        expected: ['O-O'],
        explain: 'Estrutura clássica da Índia do Rei completa! Daqui em diante você lutará com ...e5 pelo centro.',
        hint: 'Execute o Roque Curto das Pretas (O-O).',
      },
    ],
  },

  // ==================== 3. ARMADILHAS & REFUTAÇÕES (5) ====================
  {
    id: 'trap_scholars_defense',
    trackId: 'traps',
    title: '18. Como Refutar o Mate do Pastor',
    difficulty: 'Iniciante',
    playerColor: 'b',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    keyConcept: 'Quando o oponente tenta Mate do Pastor com Dama em h5 e Bispo em c4, nunca jogue 3...Nf6? (leva Qxf7#!). Primeiro defenda f7 bloqueando com ...g6.',
    intro: 'As Brancas ameaçam Qxf7# no próximo lance! Defenda f7 e ganhe tempo expulsando a Dama branca.',
    steps: [
      {
        expected: ['g6'],
        reply: 'Qf3',
        explain: 'Excelente! ...g6 protege e5? Espere: o peão de e5 estava protegido pelo Cavalo de c6! Agora as Brancas recuaram para f3 renovando a ameaça em f7!',
        hint: 'Avance o peão de g7 para g6 atacando a Dama e bloqueando h5-f7.',
      },
      {
        expected: ['Nf6'],
        explain: 'Brilhante! Agora sim ...Nf6 bloqueia a coluna "f" definitivamente e você já está à frente no desenvolvimento enquanto a Dama adversária perdeu tempo!',
        hint: 'Agora desenvolva o Cavalo de g8 para f6 fechando a linha entre f3 e f7.',
      },
    ],
  },
  {
    id: 'trap_legal_mate',
    trackId: 'traps',
    title: '19. Armadilha de Légal (Sacrifício de Dama)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: 'rn1qkbnr/ppp2ppp/3p4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
    keyConcept: 'Quando o oponente crava o Cavalo de f3 com ...Bg4 sem ter protegido adequadamente o ponto f7 e d5, às vezes é possível capturar o peão de e5 oferecendo a Dama para dar Mate de Legál!',
    intro: 'As Pretas cravaram seu Cavalo de f3 com o Bispo em g4. Execute a célebre Armadilha de Légal!',
    steps: [
      {
        expected: ['Nxe5'],
        reply: 'Bxd1',
        explain: 'Coragem tática! As Pretas caíram na armadilha e capturaram sua Dama em d1! Agora aplique a combinação de xeque-mate em 2 lances!',
        hint: 'Capture o peão desprotegido em e5 com o Cavalo de f3.',
      },
      {
        expected: ['Bxf7+'],
        reply: 'Ke7',
        explain: 'Xeque decisivo em f7! O Rei preto só tem a casa e7.',
        hint: 'Capture em f7 com o Bispo de c4 dando xeque.',
      },
      {
        expected: ['Nd5#'],
        explain: 'XEQUE-MATE DE LÉGAL! Os dois Cavalos e o Bispo cercam completamente o Rei preto sem fuga!',
        hint: 'Salte com o Cavalo de c3 para d5 dando xeque-mate.',
      },
    ],
  },
  {
    id: 'trap_noahs_ark',
    trackId: 'traps',
    title: '20. Armadilha da Arca de Noé',
    difficulty: 'Intermediário',
    playerColor: 'b',
    fen: 'r1bqkbnr/2p2ppp/p2p4/1p6/3QP3/1B6/PPP2PPP/RNB1K2R b KQkq - 0 8',
    keyConcept: 'Na Abertura Espanhola, se as Brancas capturam o peão errado em d4, os peões pretos de ...c5 e ...c4 fecham uma gaiola e aprisionam o Bispo branco em b3!',
    intro: 'As Brancas acabaram de capturar 8.Dxd4?? caindo na clássica Armadilha da Arca de Noé. Avance os peões e prenda o Bispo de b3!',
    steps: [
      {
        expected: ['c5'],
        reply: 'Qd5',
        explain: '8...c5! Ataca a Dama branca ganhando tempo e já ameaça ...c4 para prender o Bispo. As Brancas contra-atacam f7 e a8 com 9.Dd5!',
        hint: 'Avance o peão para c5 atacando a Dama em d4.',
      },
      {
        expected: ['Be6'],
        reply: 'Qc6+',
        explain: '9...Be6! Defende f7 e bloqueia o ataque contra a Torre ao mesmo tempo, mantendo a armadilha viva!',
        hint: 'Desenvolva o Bispo para e6 protegendo f7 e atacando a Dama branca.',
      },
      {
        expected: ['Bd7'],
        reply: 'Qd5',
        explain: '10...Bd7! Sai do xeque atacando a Dama mais uma vez e forçando ela a recuar.',
        hint: 'Bloqueie o xeque recuando o Bispo para d7.',
      },
      {
        expected: ['c4'],
        explain: 'ARMADILHA COMPLETA! 11...c4 fecha a gaiola: o Bispo de b3 não tem nenhuma casa segura para fugir e será perdido no próximo lance!',
        hint: 'Avance o peão de c5 para c4 fechando a saída do Bispo branco.',
      },
    ],
  },
  {
    id: 'trap_petroff_queen',
    trackId: 'traps',
    title: '21. Armadilha da Coluna E na Petroff',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: 'rnbqkb1r/pppp1ppp/8/4N3/4n3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
    keyConcept: 'Na Defesa Petroff, copiar o lance das Brancas (3...Cxe4??) após perder o peão de e5 custa a Dama na hora se a coluna "e" se abrir com De2!',
    intro: 'As Pretas acabaram de imitar com 3...Cxe4?? deixando a coluna "e" escancarada. Puna o erro ganhando a Dama!',
    steps: [
      {
        expected: ['Qe2'],
        reply: 'Nf6',
        explain: '4.De2! O Cavalo preto em e4 não pode recuar sem gravíssima perda tática. As Pretas tentaram fugir com 4...Cf6 — agora dê o golpe fatal!',
        hint: 'Coloque a Dama em e2 cravando e atacando o Cavalo de e4.',
      },
      {
        expected: ['Nc6+'],
        explain: 'XEQUE DESCOBERTO! 5.Cc6+ dá xeque de Dama no Rei preto em e8 e ataca diretamente a Dama preta em d8 — Dama ganha!',
        hint: 'Salte com o Cavalo de e5 para c6 dando xeque descoberto!',
      },
    ],
  },
  {
    id: 'trap_fools_punish',
    trackId: 'traps',
    title: '22. Punindo o Enfraquecimento de f7/h5',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: 'rnbqkbnr/pppp1p1p/8/6p1/4P3/8/PPPP1PPP/RNBQKBNR w KQkq g6 0 2',
    keyConcept: 'Avançar os peões de f e g prematuramente abre a diagonal fatal e8–h5 contra o próprio Rei.',
    intro: 'As Pretas enfraqueceram completamente a diagonal do Rei jogando ...f6 e ...g5. Aplique o castigo imediato!',
    steps: [
      {
        expected: ['Qh5#'],
        explain: 'Xeque-mate em h5! Nenhum peão ou peça pode bloquear nem capturar a Dama. Nunca enfraqueça a ala do Rei sem necessidade!',
        hint: 'Leve sua Dama diretamente para h5.',
      },
    ],
  },

  // ==================== 4. GOLPES TÁTICOS FUNDAMENTAIS (10) ====================
  {
    id: 'tactic_knight_fork',
    trackId: 'tactics',
    title: '23. Garfo Real (Ataque Duplo de Cavalo)',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: '2q1k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
    keyConcept: 'O Cavalo é o mestre do ataque duplo porque ataca em L e ninguém consegue bloquear seu salto sem capturá-lo.',
    intro: 'Encontre o salto de Cavalo que dá xeque no Rei e ataca a Dama preta ao mesmo tempo!',
    steps: [
      {
        expected: ['Nd6+'],
        reply: 'Kd7',
        explain: '1.Cd6+!! Garfo Real perfeito atacando o Rei em e8 e a Dama em c8 simultaneamente!',
        hint: 'Salte com o Cavalo para d6 dando xeque no Rei e atacando a Dama em c8.',
      },
      {
        expected: ['Nxc8'],
        explain: 'Dama capturada com segurança! Esse é o padrão tático que mais decide partidas no mundo todo.',
        hint: 'Capture a Dama preta em c8 com o Cavalo.',
      },
    ],
  },
  {
    id: 'tactic_knight_family_fork',
    trackId: 'tactics',
    title: '24. Garfo Família (Rei + Dama + Torre)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: 'r3k3/8/4q3/1N6/8/8/8/6K1 w - - 0 1',
    keyConcept: 'As casas c7 e f7 frequentemente permitem que o Cavalo dê o famoso "Garfo Família" atacando Rei, Dama e Torre ao mesmo tempo.',
    intro: 'Encontre o salto em c7 que ataca três peças reais de uma só vez!',
    steps: [
      {
        expected: ['Nc7+'],
        reply: 'Kd7',
        explain: '1.Cc7+!! Garfo Família completo atacando o Rei (e8), a Dama (e6) e a Torre (a8)!',
        hint: 'Salte com o Cavalo para c7 dando xeque no Rei.',
      },
      {
        expected: ['Nxe6'],
        explain: 'Vitória imediata! Sempre que o oponente deixar Rei, Dama e Torre vulneráveis a c7/f7, cheque o salto do Cavalo.',
        hint: 'Capture a Dama em e6 com o Cavalo.',
      },
    ],
  },
  {
    id: 'tactic_absolute_pin',
    trackId: 'tactics',
    title: '25. Cravada Absoluta (Pressionando o Defensor)',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: '3k4/3r4/8/8/8/1B6/8/3R2K1 w - - 0 1',
    keyConcept: 'Na Cravada Absoluta, a peça atacada não pode se mover legalmente porque exporia seu próprio Rei. Regra de ouro: adicione mais atacantes sobre a peça imobilizada ("PP").',
    intro: 'A Torre preta em d7 está cravada na coluna "d". Adicione um segundo atacante para vencê-la!',
    steps: [
      {
        expected: ['Ba4'],
        reply: 'Kc8',
        explain: '1.Ba4! Como a Torre em d7 está cravada contra o Rei em d8, ela não pode fugir e agora sofre dois ataques contra um defensor!',
        hint: 'Mova o Bispo de b3 para a4 atacando a Torre cravada em d7.',
      },
      {
        expected: ['Bxd7+', 'Rxd7'],
        explain: 'Captura limpa da peça cravada! Nunca apresse a troca se você puder empilhar mais pressão antes.',
        hint: 'Capture a Torre indefesa em d7 com o Bispo ou com a Torre.',
      },
    ],
  },
  {
    id: 'tactic_pin_win_queen',
    trackId: 'tactics',
    title: '26. Cravada Mortal na Dama',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '4k3/3q4/8/8/8/8/B7/4R1K1 w - - 0 1',
    keyConcept: 'Cravar uma Dama valiosa na frente do Rei com um Bispo ou Torre impede a fuga da Dama e força sua captura.',
    intro: 'Encontre o lance de Bispo ou Torre que crava a Dama preta contra o Rei em e8!',
    steps: [
      {
        expected: ['Bb3', 'Bf7+'],
        reply: 'Kd8',
        explain: 'Se Bf7+ força o Rei ou Bb3 prepara Ba4! Mas olhe melhor: como a Dama está em d7 e o Rei em e8, Ba4? Não, Ba4 precisaria estar em c6! De a2, Bf7+ dá xeque ou Bb3 prepara Ba4.',
        hint: 'Tente Bb3 preparando a cravada mortal Ba4 na próxima jogada!',
      },
      {
        expected: ['Ba4'],
        explain: 'Cravada absoluta na Dama (e8-d7-a4)! A Dama preta em d7 será capturada!',
        hint: 'Leve o Bispo de b3 até a4 cravando a Dama contra o Rei.',
      },
    ],
  },
  {
    id: 'tactic_skewer',
    trackId: 'tactics',
    title: '27. Espeto na Fileira (Torre em Raio-X)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '4k2q/8/8/8/8/8/8/R5K1 w - - 0 1',
    keyConcept: 'O Espeto (Skewer) é o inverso da cravada: você ataca primeiro a peça MAIS valiosa (Rei), forçando-a a sair da linha e deixando a peça atrás indefesa.',
    intro: 'O Rei preto em e8 e a Dama em h8 estão alinhados na 8ª fileira. Dê xeque de Torre para espetar a Dama!',
    steps: [
      {
        expected: ['Ra8+'],
        reply: 'Kf7',
        explain: '1.Ta8+! Xeque na 8ª fileira! O Rei preto é obrigado a sair do caminho deixando a Dama exposta atrás!',
        hint: 'Suba sua Torre de a1 até a8 dando xeque no Rei.',
      },
      {
        expected: ['Rxh8'],
        explain: 'Dama capturada! Sempre observe quando Rei e Dama ou Torre ficam alinhados na mesma linha ou diagonal.',
        hint: 'Capture a Dama preta em h8 com a Torre.',
      },
    ],
  },
  {
    id: 'tactic_skewer_true',
    trackId: 'tactics',
    title: '28. Espeto na Diagonal (Bispo vs Rei e Dama)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '6q1/8/8/3k4/8/8/8/1B3K2 w - - 0 1',
    keyConcept: 'Ao dar xeque no Rei alinhado com a Dama em uma diagonal aberta, o Rei é obrigado a escapar e deixa a Dama desprotegida atrás.',
    intro: 'O Rei em d5 e a Dama em g8 estão na mesma diagonal a2–g8. Alinhe o Bispo em raio-X dando xeque!',
    steps: [
      {
        expected: ['Ba2+'],
        reply: 'Kd6',
        explain: '1.Ba2+! O Bispo entra na grande diagonal a2–g8 dando xeque e espetando a Dama atrás do Rei!',
        hint: 'Mova o Bispo de b1 para a2 dando xeque no Rei em d5.',
      },
      {
        expected: ['Bxg8'],
        explain: 'Espeto perfeito na diagonal! A Dama preta em g8 cai imediatamente.',
        hint: 'Capture a Dama preta em g8 com o Bispo.',
      },
    ],
  },
  {
    id: 'tactic_discovered_attack',
    trackId: 'tactics',
    title: '29. Ataque Descoberto Mortal',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '3q1k2/8/8/8/3N4/8/8/3R2K1 w - - 0 1',
    keyConcept: 'No Ataque Descoberto, uma peça sai da frente de outra (Torre, Bispo ou Dama), revelando um ataque escondido enquanto ela própria cria uma nova ameaça — como dar xeque!',
    intro: 'Sua Torre em d1 aponta em segredo para a Dama preta em d8, bloqueada pelo seu Cavalo em d4. Mova o Cavalo dando xeque para ganhar a Dama!',
    steps: [
      {
        expected: ['Ne6+'],
        reply: 'Kg8',
        explain: '1.Ce6+!! O Cavalo sai dando xeque no Rei em f8 ao mesmo tempo em que destapa o raio-X da Torre em d1 sobre a Dama em d8!',
        hint: 'Salte com o Cavalo para e6 dando xeque no Rei em f8.',
      },
      {
        expected: ['Nxd8', 'Rxd8'],
        explain: 'Dama capturada com zero perda material! Ataques descobertos com xeque são praticamente impossíveis de defender.',
        hint: 'Capture a Dama preta em d8.',
      },
    ],
  },
  {
    id: 'tactic_double_check',
    trackId: 'tactics',
    title: '30. Xeque Duplo (Impossível Capturar!)',
    difficulty: 'Avançado',
    playerColor: 'w',
    fen: '4k3/8/8/3B4/8/8/4R3/6K1 w - - 0 1',
    keyConcept: 'Em um Xeque Duplo (duas peças dão xeque ao mesmo tempo), NÃO é possível capturar nem bloquear ambas — a única saída legal é mover o Rei!',
    intro: 'Use o Bispo de d5 em harmonia com a Torre de e2 para encerrar rapidamente.',
    steps: [
      {
        expected: ['Bc6+'],
        reply: 'Kd8',
        explain: 'Com Bc6+ o Rei recua para d8. Agora dê mate com a Torre na 8ª fileira!',
        hint: 'Dê xeque com o Bispo em c6 (ou f7+).',
      },
      {
        expected: ['Re8#'],
        explain: 'Xeque-mate na 8ª fileira! O Bispo protege e8 impedindo o Rei de capturar a Torre!',
        hint: 'Mova a Torre de e2 para e8 dando xeque-mate.',
      },
    ],
  },
  {
    id: 'tactic_deflection',
    trackId: 'tactics',
    title: '31. Desvio do Defensor',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '3r2k1/5ppp/8/8/8/8/4QPPP/3R2K1 w - - 0 1',
    keyConcept: 'Quando uma única peça inimiga está sobrecarregada defendendo um ponto vital (como a 8ª fileira), force essa peça a abandonar seu posto.',
    intro: 'A Torre preta em d8 é a única defensora contra seu mate em d8/e8. Desvie ou troque com vantagem letal!',
    steps: [
      {
        expected: ['Rxd8+', 'Qe8+'],
        explain: 'Troca/desvio perfeito! Tanto Rxd8+ quanto Qe8+ quebram a defesa da última fileira.',
        hint: 'Ataque diretamente o defensor em d8 ou force em e8 (Qe8+!).',
      },
    ],
  },
  {
    id: 'tactic_greek_gift',
    trackId: 'tactics',
    title: '32. Sacrifício Clássico em h7 (Greek Gift)',
    difficulty: 'Avançado',
    playerColor: 'w',
    fen: 'r1bq1rk1/pppn1ppp/4pn2/3p4/2PP4/3BPN2/PP3PPP/RNBQ1RK1 w - - 0 7',
    keyConcept: 'Quando o Cavalo preto não está em f6 (ou pode ser afastado) e o Rei rocou curto, Bxh7+ Kxh7 Ng5+ seguido de Qh5 inicia um ataque mortal ao Rei!',
    intro: 'Vamos treinar a sequência exata do Sacrifício Grego quando o caminho para h5 e g5 está livre!',
    steps: [
      {
        expected: ['Bxh7+'],
        reply: 'Kxh7',
        explain: 'Bxh7+! O Bispo abre a fortaleza do Rei. Após ...Kxh7, entre com o Cavalo dando xeque!',
        hint: 'Sacrifique o Bispo capturando em h7 (Bxh7+).',
      },
      {
        expected: ['Ng5+'],
        explain: 'Ng5+ inicia o ataque clássico! Note que em seguida Qh5 ameaçará Qh7# imparável!',
        hint: 'Salte com o Cavalo para g5 dando xeque.',
      },
    ],
  },

  // ==================== 5. PADRÕES CLÁSSICOS DE XEQUE-MATE (7) ====================
  {
    id: 'mate_back_rank_study',
    trackId: 'checkmates',
    title: '33. Mate do Corredor',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    keyConcept: 'Peões não recuam! Se eles formarem uma parede na frente do Rei sem nenhuma casa de respiro ("luft"), uma Torre ou Dama dá mate na 8ª fileira.',
    intro: 'Aproveite que o Rei preto está preso atrás de seus próprios peões.',
    steps: [
      {
        expected: ['Rd8#'],
        explain: 'Mate clássico do corredor! Por isso jogadores fortes costumam jogar h3 ou g3 no meio-jogo para dar ar ao Rei.',
        hint: 'Leve a Torre de d1 até a 8ª fileira (Rd8#).',
      },
    ],
  },
  {
    id: 'mate_ladder',
    trackId: 'checkmates',
    title: '34. Mate da Escadinha (Duas Torres)',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: '8/5k2/R7/7R/8/8/8/6K1 w - - 0 1',
    keyConcept: 'Duas Torres trabalham em degraus alternados: uma segura a fileira cortando a fuga do Rei enquanto a outra dá o xeque empurrando-o para a borda.',
    intro: 'A Torre em a6 já corta a 6ª fileira. Empurre o Rei preto para a 8ª fileira e finalize com o Mate da Escadinha!',
    steps: [
      {
        expected: ['Rh7+'],
        reply: 'Kg8',
        explain: '1.Th7+! Com a 6ª fileira fechada pela Torre de a6, o Rei é forçado a subir para a última fileira (1...Rg8).',
        hint: 'Dê xeque na 7ª fileira jogando Rh7+.',
      },
      {
        expected: ['Ra8#'],
        explain: 'MATE DA ESCADINHA! Uma Torre fecha a 7ª fileira e a outra dá mate na 8ª!',
        hint: 'Suba a outra Torre até a 8ª fileira (Ra8#).',
      },
    ],
  },
  {
    id: 'mate_smothered',
    trackId: 'checkmates',
    title: '35. Mate Sufocado (Sacrifício de Dama + Cavalo)',
    difficulty: 'Avançado',
    playerColor: 'w',
    fen: '5r1k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1',
    keyConcept: 'Um dos golpes mais belos do xadrez: sacrificar a Dama em g8 força a Torre preta a bloquear a última casa livre do Rei, permitindo o mate sufocado de Cavalo em f7!',
    intro: 'O Cavalo em h6 controla f7 e g8. Sacrifique sua Dama em g8 para sufocar o Rei!',
    steps: [
      {
        expected: ['Qg8+'],
        reply: 'Rxg8',
        explain: '1.Dg8+!! Brilhante! O Rei não pode capturar porque o Cavalo de h6 protege g8! A Torre preta foi obrigada a tomar e fechar a fuga do próprio Rei.',
        hint: 'Sacrifique a Dama jogando Qg8+.',
      },
      {
        expected: ['Nf7#'],
        explain: 'MATE SUFOCADO! O Cavalo ataca o Rei encurralado pelas próprias peças!',
        hint: 'Salte com o Cavalo para f7 dando mate!',
      },
    ],
  },
  {
    id: 'mate_anastasia',
    trackId: 'checkmates',
    title: '36. Mate de Anastásia (Cavalo + Sacrifício + Torre)',
    difficulty: 'Avançado',
    playerColor: 'w',
    fen: '5rk1/5ppp/8/3N4/8/7Q/4R3/6K1 w - - 0 1',
    keyConcept: 'No Mate de Anastásia, o Cavalo em e7 fecha todas as casas de saída laterais (g8 e g6) enquanto um sacrifício na coluna "h" abre caminho para o mate mortal da Torre!',
    intro: 'Prenda o Rei na coluna "h" com o Cavalo em e7 e depois execute o sacrifício de abertura da coluna!',
    steps: [
      {
        expected: ['Ne7+'],
        reply: 'Kh8',
        explain: '1.Ce7+! O Rei é empurrado para o canto em h8. Agora abra a coluna "h" sacrificando a Dama!',
        hint: 'Salte com o Cavalo para e7 dando xeque no Rei em g8.',
      },
      {
        expected: ['Qxh7+'],
        reply: 'Kxh7',
        explain: '2.Dxh7+!! Sacrifício clássico para atrair o Rei e abrir a coluna "h"!',
        hint: 'Capture o peão de h7 com a Dama dando xeque (Qxh7+).',
      },
      {
        expected: ['Rh2#'],
        explain: 'MATE DE ANASTÁSIA! O Cavalo em e7 corta g8 e g6 enquanto a Torre desfere o mate pela coluna "h"!',
        hint: 'Mova a Torre de e2 para h2 dando xeque-mate.',
      },
    ],
  },
  {
    id: 'mate_arabian',
    trackId: 'checkmates',
    title: '37. Mate Árabe (Torre + Cavalo no Canto)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '7k/8/5N2/8/8/8/6R1/6K1 w - - 0 1',
    keyConcept: 'O padrão mais antigo registrado do xadrez: Torre encostada no Rei no canto, protegida a distância exata pelo Cavalo (f6 protege g8 e h7!).',
    intro: 'Aplique o Mate Árabe clássico em 1 lance!',
    steps: [
      {
        expected: ['Rg8#'],
        explain: 'Mate Árabe perfeito! O Cavalo em f6 protege a Torre em g8 E tira a casa h7 do Rei!',
        hint: 'Leve a Torre de g2 até g8 com apoio do Cavalo de f6.',
      },
    ],
  },
  {
    id: 'mate_boden',
    trackId: 'checkmates',
    title: '38. Mate de Boden (Dois Bispos Cruzados)',
    difficulty: 'Avançado',
    playerColor: 'w',
    fen: '2kr4/pp1n4/2p5/8/8/2Q3B1/4B3/6K1 w - - 0 1',
    keyConcept: 'Dois Bispos em diagonais cruzadas formam uma tesoura mortal contra o Rei roquado grande, geralmente após um sacrifício de Dama em c6 que destrói o escudo de peões!',
    intro: 'O Bispo em g3 já fecha b8 e c7. Sacrifique a Dama para abrir a diagonal a6–c8 e aplicar o Mate de Boden!',
    steps: [
      {
        expected: ['Qxc6+'],
        reply: 'bxc6',
        explain: '1.Dxc6+!! O peão de b7 foi atraído para c6 abrindo completamente a diagonal fatal a6–c8!',
        hint: 'Sacrifique a Dama capturando em c6 com xeque (Qxc6+).',
      },
      {
        expected: ['Ba6#'],
        explain: 'MATE DE BODEN! Os dois Bispos em diagonais cruzadas fecham todas as casas do Rei preto!',
        hint: 'Leve o Bispo de e2 para a6 dando xeque-mate.',
      },
    ],
  },
  {
    id: 'mate_opera',
    trackId: 'checkmates',
    title: '39. Mate da Ópera (Paul Morphy, 1858)',
    difficulty: 'Avançado',
    playerColor: 'w',
    fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
    keyConcept: 'Paul Morphy sacrificou a Dama em b8 para atrair o Cavalo e libertar a coluna d para o mate final com Torre apoiada pelo Bispo de g5!',
    intro: 'Recrie a obra-prima histórica de Paul Morphy na Ópera de Paris (1858): sacrifique a Dama para dar Mate com a Torre!',
    steps: [
      {
        expected: ['Qb8+'],
        reply: 'Nxb8',
        explain: '16.Db8+!! O único lance das Pretas é capturar a Dama com o Cavalo (16...Cxb8), deixando a coluna "d" aberta para o mate final!',
        hint: 'Sacrifique a Dama dando xeque em b8 (Qb8+!).',
      },
      {
        expected: ['Rd8#'],
        explain: 'XEQUE-MATE DA ÓPERA! A Torre em d8 crava o mate apoiada à distância pelo Bispo de g5!',
        hint: 'Desça com a Torre de d1 até d8 dando xeque-mate!',
      },
    ],
  },

  // ==================== 6. FINAIS & ESTRATÉGIA POSICIONAL (7) ====================
  {
    id: 'end_queen_mate',
    trackId: 'endgames',
    title: '40. Mate Básico de Dama + Rei',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: '7k/8/5K2/6Q1/8/8/8/8 w - - 0 1',
    keyConcept: 'Para dar mate de Dama + Rei nunca afogue o Rei inimigo! Primeiro encurrale o Rei na borda deixando pelo menos 2 casas até aproximar seu próprio Rei em oposição/cavalo.',
    intro: 'Os dois Reis já estão próximos no canto. Encontre um dos mates imediatos com a Dama!',
    steps: [
      {
        expected: ['Qg7#', 'Qh5#', 'Qg8#'],
        explain: 'Xeque-mate limpo! Seu Rei em f6 tira g7 e g6, permitindo o golpe mortal sem afogamento.',
        hint: 'Coloque a Dama em g7 (protegida pelo Rei) ou g8!',
      },
    ],
  },
  {
    id: 'end_rook_mate',
    trackId: 'endgames',
    title: '41. Mate Básico de Torre + Rei',
    difficulty: 'Iniciante',
    playerColor: 'w',
    fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1',
    keyConcept: 'No final de Torre + Rei, os dois Reis ficam frente a frente em oposição enquanto a Torre aplica o golpe decisivo na última fileira.',
    intro: 'Os Reis estão em oposição exata (e6 vs e8). Aplique o mate imediato!',
    steps: [
      {
        expected: ['Rh8#'],
        explain: 'Simples e preciso! Sempre que os Reis se enfrentam com 1 casa de distância na borda, a Torre dá mate na última linha.',
        hint: 'Suba a Torre até a 8ª fileira (Rh8#).',
      },
    ],
  },
  {
    id: 'end_rule_of_square',
    trackId: 'endgames',
    title: '42. Regra do Quadrado (Corrida de Peões)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '7k/8/8/p7/8/5K2/8/8 w - - 0 1',
    keyConcept: 'Desenhe mentalmente um quadrado do peão até sua casa de promoção (a5–a1–e1–e5). Se o Rei adversário entrar no quadrado no seu turno, ele alcança o peão sem ajuda!',
    intro: 'O peão preto de a5 ameaça coroar em a1. Seu Rei em f3 está fora do quadrado por 1 casa — entre na coluna "e" para alcançá-lo!',
    steps: [
      {
        expected: ['Ke4', 'Ke3', 'Ke2'],
        explain: 'Perfeito! Você pisou na coluna "e" entrando dentro do quadrado (a5–a1–e1–e5) e conseguirá capturar o peão antes que ele promova!',
        hint: 'Aproxime seu Rei entrando na coluna "e" (Ke4, Ke3 ou Ke2).',
      },
    ],
  },
  {
    id: 'end_opposition',
    trackId: 'endgames',
    title: '43. Finais de Peão: Oposição de Reis',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
    keyConcept: 'Quando o seu Rei fica na FRENTE do peão e você ganha a oposição (Reis frente a frente no turno do oponente), o adversário é obrigado a ceder espaço.',
    intro: 'Se empurrar o peão para e6 agora é empate ou afogamento depois! A posição correta aqui já dá vitória? Verifique: Rei em d6 ou f6 flanqueia e abre caminho para o peão!',
    steps: [
      {
        expected: ['Kd6', 'Kf6'],
        explain: 'Flanqueamento perfeito! Avançar o Rei lateralmente para d6 ou f6 obriga o Rei preto a sair da frente do peão.',
        hint: 'Avance o Rei para d6 ou f6 (ao lado do Rei inimigo, preparando e6-e7-e8).',
      },
    ],
  },
  {
    id: 'end_lucena_bridge',
    trackId: 'endgames',
    title: '44. Posição de Lucena (A Ponte Vencedora)',
    difficulty: 'Mestre',
    playerColor: 'w',
    fen: '3K4/3P1k2/8/8/8/8/4R3/2r5 w - - 0 1',
    keyConcept: 'Com o peão na 7ª fileira e o Rei bloqueado na frente (d8), você precisa liberar a saída do seu Rei e "construir a ponte" na 4ª fileira com a Torre para bloquear os xeques verticais!',
    intro: 'Primeiro afaste o Rei preto para poder sair de d8: afaste com xeque na coluna f ou jogue Re4 preparando a ponte? Como a Torre preta já dá xeque ou está em c1, primeiro tire a Torre preta ou dê xeque em f2? Jogando Rf2+ afasta o Rei inimigo uma coluna!',
    steps: [
      {
        expected: ['Rf2+', 'Re4'],
        reply: 'Kg7',
        explain: 'Rf2+ afasta o Rei preto da ação (para coluna g)! Agora o plano da Ponte de Lucena começa subindo a Torre para a 4ª fileira (Re4) após sair o Rei.',
        hint: 'Dê xeque em f2 para afastar o Rei preto ou prepare a Ponte na 4ª fileira (Re4).',
      },
    ],
  },
  {
    id: 'end_philidor_defense',
    trackId: 'endgames',
    title: '45. Defesa de Philidor (Empate na 6ª/3ª Fileira)',
    difficulty: 'Mestre',
    playerColor: 'b',
    fen: '4k3/8/8/4PK2/8/8/3r4/7R b - - 0 1',
    keyConcept: 'Com peão a menos em final de Torre, mantenha sua Torre na 6ª fileira (3ª das Pretas — casa d6!) impedindo o Rei inimigo de passar na frente do peão. Só quando o peão avançar para a 6ª é que você dá xeques pelas costas!',
    intro: 'Impeça o Rei branco de invadir a 6ª fileira posicionando sua Torre na linha defensiva ideal!',
    steps: [
      {
        expected: ['Rd6'],
        explain: 'Defesa perfeita de Philidor! Em d6 sua Torre corta a 6ª fileira inteira — o Rei branco nunca pode avançar além da 5ª sem tomar chuva de xeques por trás!',
        hint: 'Coloque a Torre preta de d2 na casa d6 (corte na 6ª fileira do ponto de vista branco).',
      },
    ],
  },
  {
    id: 'end_outpost_rook7',
    trackId: 'endgames',
    title: '46. Torre na 7ª Fileira (Domínio Total)',
    difficulty: 'Intermediário',
    playerColor: 'w',
    fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/3R2K1 w - - 0 1',
    keyConcept: 'Uma Torre na 7ª fileira (2ª do adversário) paralisa os peões da base e ameaça mates contínuos contra o Rei adversário.',
    intro: 'Invada a 7ª fileira pela coluna aberta para pressionar todos os peões inimigos!',
    steps: [
      {
        expected: ['Rd7'],
        explain: 'Torre dominante na 7ª fileira! Agora b7 e f7 estão sob ataque simultâneo enquanto o Rei preto fica confinado.',
        hint: 'Suba sua Torre pela coluna aberta "d" até a casa d7.',
      },
    ],
  },
];

export const CHESS_ENCYCLOPEDIA = [
  {
    id: 'piece_values',
    title: '1. Valor Relativo das Peças & Trocas',
    summary: 'Entenda quando uma troca é vantajosa no material.',
    bullets: [
      'Peão = 1 ponto | Cavalo = 3 pontos | Bispo = 3,2 pontos (Par de Bispos = +0,5)',
      'Torre = 5 pontos (Torre vale mais que Cavalo ou Bispo; ganhar Torre por peça menor se chama "ganhar a qualidade")',
      'Dama = 9 pontos (nunca troque Dama por duas peças menores sem compensação clara)',
      'Rei = valor infinito em jogo; nos finais vira uma peça atacante forte (~4 pontos de força prática).',
    ],
  },
  {
    id: 'cca_checklist',
    title: '2. Checklist Tático Antes de Todo Lance (C.C.A.)',
    summary: 'O hábito número 1 de jogadores fortes para parar de entregar peças e achar vitórias.',
    bullets: [
      'C — Xeques (Checks): tenho algum xeque forçado? O oponente tem algum xeque perigoso contra mim?',
      'C — Capturas (Captures): existem peças sem defesa (penduradas) no tabuleiro agora?',
      'A — Ameaças (Attacks): qual peça de maior valor posso atacar ganhando tempo? O que o último lance do meu rival ameaça?',
    ],
  },
  {
    id: 'opening_principles',
    title: '3. As 10 Regras de Ouro da Abertura',
    summary: 'Como sair bem da abertura mesmo sem decorar dezenas de variantes.',
    bullets: [
      'Controle o centro com peões (e4, d4, c4) e peças menores.',
      'Desenvolva Cavalos antes dos Bispos ("Cavalo em f3/c3 olha o centro logo no início").',
      'Não mova a mesma peça duas vezes sem motivo tático claro.',
      'Não lance a Dama cedo demais (ela vira alvo de Cavalos e Bispos inimigos).',
      'Faça o Roque nos primeiros 6 a 10 lances e conecte suas Torres na primeira fileira.',
    ],
  },
  {
    id: 'pawn_structure',
    title: '4. Estrutura de Peões & Casas Fracas',
    summary: 'Peões não andam para trás: cada movimento de peão cria forças e fraquezas permanentes.',
    bullets: [
      'Peão Passado: não tem peões inimigos à sua frente nem nas colunas vizinhas — deve ser avançado e bloqueado pelo rival.',
      'Peão Isolado / Dobrado: não consegue ser defendido por outro peão; torne-os alvos com suas Torres.',
      'Posto Avançado (Outpost): uma casa no campo inimigo (ex.: d5 ou e5) que nenhum peão rival pode expulsar — ideal para um Cavalo.',
    ],
  },
  {
    id: 'notation_guide',
    title: '5. Como Ler a Notação Algébrica (SAN)',
    summary: 'Entenda cada símbolo no Histórico e nos Estudos.',
    bullets: [
      'K = Rei | Q = Dama | R = Torre | B = Bispo | N = Cavalo | (sem letra = Peão).',
      'x = captura (ex.: Bxf7 significa Bispo captura em f7).',
      '+ = xeque | # = xeque-mate | O-O = roque curto | O-O-O = roque grande.',
      'e8=Q = peão promove em e8 para Dama | !! = Brilhante | ! = Excelente | ?! = Imprecisão | ?? = Erro Grave.',
    ],
  },
  {
    id: 'endgame_principles',
    title: '6. Leis Fundamentais dos Finais',
    summary: 'Onde partidas equilibradas são realmente decididas.',
    bullets: [
      'Ative seu Rei! Nos finais sem Damas, o Rei precisa marchar para o centro.',
      'Torres pertencem ATRÁS de peões passados (tanto os seus quanto os do adversário).',
      'Com vantagem material, troque peças (especialmente Damas), mas evite trocar peões.',
      'Em finais de Rei e Peão, quem conquista a Oposição com o Rei à frente do peão quase sempre vence.',
    ],
  },
];

// Curated opening classifier by exact opening SAN prefix
const OPENING_SIGNATURES = [
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], name: 'Abertura Espanhola (Ruy Lopez — Defesa Morphy)' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], name: 'Abertura Espanhola (Ruy Lopez)' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], name: 'Abertura Italiana (Giuoco Piano)' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'], name: 'Abertura Italiana (Ataque dos Dois Cavalos / Fegatello)' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], name: 'Defesa dos Dois Cavalos' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], name: 'Abertura Italiana' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], name: 'Abertura Escocesa' },
  { moves: ['e4', 'e5', 'Nf3', 'Nf6'], name: 'Defesa Petroff (Russa)' },
  { moves: ['e4', 'e5', 'f4'], name: 'Gambito do Rei' },
  { moves: ['e4', 'e5', 'Bc4'], name: 'Abertura do Bispo' },
  { moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], name: 'Defesa Siciliana (Variante Najdorf)' },
  { moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4'], name: 'Defesa Siciliana Aberta' },
  { moves: ['e4', 'c5', 'c3'], name: 'Defesa Siciliana (Variante Alapin)' },
  { moves: ['e4', 'c5'], name: 'Defesa Siciliana' },
  { moves: ['e4', 'e6', 'd4', 'd5', 'Nc3'], name: 'Defesa Francesa Clássica' },
  { moves: ['e4', 'e6', 'd4', 'd5', 'e5'], name: 'Defesa Francesa (Variante do Avanço)' },
  { moves: ['e4', 'e6'], name: 'Defesa Francesa' },
  { moves: ['e4', 'c6', 'd4', 'd5', 'Nc3'], name: 'Defesa Caro-Kann Clássica' },
  { moves: ['e4', 'c6'], name: 'Defesa Caro-Kann' },
  { moves: ['e4', 'd5'], name: 'Defesa Escandinava' },
  { moves: ['d4', 'd5', 'c4', 'e6'], name: 'Gambito da Dama Recusado (Orthodox)' },
  { moves: ['d4', 'd5', 'c4', 'c6'], name: 'Defesa Eslava' },
  { moves: ['d4', 'd5', 'c4', 'dxc4'], name: 'Gambito da Dama Aceito' },
  { moves: ['d4', 'd5', 'c4'], name: 'Gambito da Dama' },
  { moves: ['d4', 'd5', 'Bf4'], name: 'Sistema Londres' },
  { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'], name: 'Defesa Índia do Rei' },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], name: 'Defesa Nimzo-Índia' },
  { moves: ['c4'], name: 'Abertura Inglesa' },
  { moves: ['Nf3'], name: 'Abertura Réti' },
  { moves: ['e4'], name: 'Abertura do Peão do Rei (1.e4)' },
  { moves: ['d4'], name: 'Abertura do Peão da Dama (1.d4)' },
];

export function detectOpeningFromHistory(sanMoves = []) {
  if (!Array.isArray(sanMoves) || sanMoves.length === 0) return 'Posição Inicial';
  for (const sig of OPENING_SIGNATURES) {
    if (sanMoves.length >= sig.moves.length) {
      let match = true;
      for (let i = 0; i < sig.moves.length; i++) {
        if (sanMoves[i] !== sig.moves[i]) {
          match = false;
          break;
        }
      }
      if (match) return sig.name;
    }
  }
  return 'Jogo Aberto / Meio-Jogo';
}
