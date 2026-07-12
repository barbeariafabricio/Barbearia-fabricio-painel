# Barbearia — Painel Interno (HTML puro + Firebase)

Painel administrativo estático (HTML/CSS/JS) para a **equipe da barbearia**.
Permite controlar em tempo real:

- **Status do salão** — aberto ou fechado.
- **Intervalo do barbeiro** — trabalhando normalmente ou em intervalo.

As configurações são gravadas no **Firebase Firestore** (coleção `config`,
documento `status`), então o app do cliente pode ler esse mesmo documento para
bloquear/liberar os agendamentos.

## Como hospedar no GitHub Pages
1. Crie um repositório no GitHub e envie estes arquivos (`index.html`, `styles.css`, `app.js`, `firebase-config.js`).
2. No GitHub, acesse **Settings → Pages**.
3. Em *Source*, escolha a branch `main` (pasta `/root`) e salve.
4. Aguarde a URL ficar no ar.

> Dica: hospede este painel em um repositório/URL separado do app do cliente,
> pois ele é de uso interno.

## Configurar o Firebase (obrigatório)
1. Use **o mesmo projeto Firebase** do app do cliente.
2. Em *Configurações do projeto → Seus apps → Web*, copie o objeto `firebaseConfig`.
3. Cole em `firebase-config.js` (o mesmo usado no app do cliente).

### Regras de segurança sugeridas (Firestore)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Agendamentos do cliente
    match /agendamentos/{doc} {
      allow read, create: if true;
      allow update, delete: if false;
    }
    // Configuração do salão — leitura pública, escrita interna
    match /config/{doc} {
      allow read: if true;
      allow write: if true; // ⚠️ ajuste para exigir autenticação em produção
    }
  }
}
```

> ⚠️ Como o painel é público por padrão, qualquer pessoa com a URL pode alterar
> as configurações. Para produção, recomenda-se ativar **Firebase Authentication**
> e restringir a escrita da coleção `config` a usuários autenticados.

## Estrutura do documento `config/status`
```json
{
  "open": true,        // salão aberto?
  "onBreak": false,    // barbeiro em intervalo?
  "updatedAt": <timestamp>
}
```

## Como integrar ao app do cliente
No `app.js` do cliente, escute o documento `config/status` e, se `open === false`
ou `onBreak === true`, exiba um aviso e desabilite o botão de agendar.
