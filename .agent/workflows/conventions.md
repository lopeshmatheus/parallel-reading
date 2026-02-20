---
description: Convenções e Padrões do Projeto Leitor Paralelo de EPUB
---

# Convenções do Projeto

Este documento define regras, padrões e convenções a serem utilizadas pelo Agente Antigravity (e desenvolvedores) durante a construção do app Leitor Paralelo de EPUB.

## 1. Arquitetura e Estrutura

- **TDD Primeira Abordagem:** Todo código core (leitura de epub, conversão de sentenças, paginação, chamadas à API) DEVE ser acompanhado ou precedido por testes automatizados (Vitest).
- **Sem Backend / Client-Side Only:** O app roda 100% no cliente. Tudo deve ser salvo no `IndexedDB` para persistência.
- **Estrutura de Pastas (Sugerida):**
  - `src/components/`: Componentes UI reutilizáveis.
  - `src/services/`: Lógica de extração, TDD, API, DB.
  - `src/views/`: Telas principais (Library, BookOverview, Reader).
  - `src/tests/`: Arquivos de teste globais ou `*.test.ts` junto aos arquivos.
  - `src/styles/`: CSS global e variáveis de design system.

## 2. Design e Estilização

- **Estética Neo-Brutalista:**
  - Cores sólidas e vibrantes.
  - Bordas duras e marcadas (`border: 3px solid black`).
  - Sombras fortes sem desfoque (`box-shadow: 4px 4px 0px black`).
  - Tipografia forte e limpa (Inter, Roboto Mono, etc).
- **CSS:** Apenas Vanilla CSS. O uso de Tailwind CSS **não é permitido**.
- **Animações:** Evite transições lentas; prefira micro-interações duras (ex: ao passar o click num botão ele se move 2px para baixo).

## 3. Lógica e Funcionalidades

- **Paginação:** O tradutor funciona por "páginas" virtuais de 10 frases para economizar tokens.
- **Tradução:** Preservação máxima do sentido e pontuação. A IA não deve modificar a quantidade de frases originadas pelo `Intl.Segmenter`.
- **Cache Local:** Nunca chamar a API para uma página/frase que já foi traduzida e salva no IndexedDB.

Estas regras devem ser consultadas e aplicadas ativamente.
