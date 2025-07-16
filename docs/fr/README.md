<div align="center">
<a href="https://github.com/putyy/res-downloader"><img src="../../images/ollama.png" width="120" alt="ollama"/></a>
<h1>Ollama Pro</h1>
</div>

**🌍 Versions multilingues :**

[English](../../README.md) | [中文](../zh/README.md) | [日本語](../ja/README.md) | [한국어](../ko/README.md) | Français


[![GitHub stars](https://img.shields.io/github/stars/downly-app/ollama.vip)](https://github.com/downly-app/ollama.vip/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/downly-app/ollama.vip)](https://github.com/downly-app/ollama.vip/fork)
[![License](https://img.shields.io/badge/license-GPL%20v3%20with%20Commercial%20Exception-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/downly-app/ollama.vip)](https://github.com/downly-app/ollama.vip/releases)
[![Downloads](https://img.shields.io/github/downloads/downly-app/ollama.vip/total)](https://github.com/downly-app/ollama.vip/releases)

Application de bureau moderne et multiplateforme pour interagir avec les modèles Ollama. Construite avec React, TypeScript et Tauri pour des performances et une sécurité optimales.

> 🤖 **Développement piloté par l'IA** : Ce projet a été développé en collaboration avec le codage assisté par l'IA (vibe coding) utilisant WindSurf + Cursor + Trae + Lovable (conception UI et frontend) + Manus (recherche initiale et analyse des exigences), principalement alimenté par les modèles Claude 4 et Gemini 2.5 Pro.

**Interface du tableau de bord principal :**

![General](../../images/image-20250710231818143.png)

*Le tableau de bord principal fournit un aperçu de l'état du système, la gestion des modèles et un accès rapide aux fonctionnalités clés.*

## ✨ Fonctionnalités

### 🤖 Chat IA
- **Support multi-modèles** : Prise en charge des modèles OpenAI et DeepSeek
- **Conversation en temps réel** : Expérience de chat fluide en streaming
- **Gestion des messages** : Éditer, supprimer, copier et renvoyer des messages
- **Historique des conversations** : Historique de chat persistant avec fonction de recherche
- **Rendu Markdown** : Prise en charge complète de la coloration syntaxique et du formatage du code

**Interface de chat IA :**

![AI Chat](../../images/image-20250710231733710.png)

*Interface de chat propre et intuitive avec historique des messages, prise en charge de Markdown et réponses en streaming en temps réel.*

![Dialogue image et texte IA](../../images/image-20250716000309954.png)

*Mélangez harmonieusement texte et images pour des conversations plus riches et contextuelles.*

**Configuration de l'API du modèle tiers :**

![Third-party model API configuration](../../images/image-20250710232528111.png)

*Panneau de configuration simple pour configurer les clés API et paramètres pour OpenAI, DeepSeek et autres fournisseurs d'IA.*

### 🎨 Interface utilisateur
- **Design moderne** : UI glassmorphisme avec animations fluides
- **Système de thèmes** : Plusieurs thèmes intégrés avec effets de dégradé
- **Mise en page responsive** : Interface qui s'adapte aux différentes tailles d'écran
- **Mode sombre** : Interface sombre agréable pour les yeux
- **Internationalisation** : Support pour l'anglais, le chinois, le japonais, le coréen et le français

### 🔧 Gestion des modèles
- **Aperçu des modèles** : Affichage et gestion des modèles IA disponibles
- **Sélection de fournisseur** : Basculement entre différents fournisseurs de services IA
- **Gestion de configuration** : Configuration facile des clés API et paramètres

**Gestion des modèles locaux :**

![Local model management](../../images/image-20250710232127313.png)

*Vue complète des modèles installés localement avec options pour gérer, mettre à jour et supprimer les modèles.*

**Détails des modèles locaux :**

![Read local model details](../../images/image-20250710232149771.png)

*Informations détaillées pour chaque modèle, incluant la taille, les paramètres et les métriques de performance.*

**Bibliothèque de modèles en ligne :**

![Online models](../../images/image-20250710231856427.png)

*Parcourir et découvrir les modèles disponibles dans la bibliothèque Ollama avec fonctionnalité de téléchargement en un clic.*

**Page d'informations du modèle :**

![Online model details page](../../images/image-20250710232018977.png)

*Détails complets du modèle avant téléchargement, incluant description, capacités et exigences système.*

**Gestion des téléchargements :**

![Ollama model download management](../../images/image-20250710232244938.png)

*Suivi en temps réel de la progression des téléchargements avec options pour suspendre, reprendre et annuler les installations de modèles.*

### ⚙️ Fonctionnalités système
- **Multiplateforme** : Support Windows, macOS et Linux
- **Performance native** : Construit avec Tauri pour des performances optimales
- **Persistance des données** : Stockage local des configurations et historique de chat
- **Raccourcis clavier** : Navigation clavier efficace

## 📦 Installation

### Prérequis

- [Ollama](https://ollama.ai/) installé et en cours d'exécution
- Node.js 18+ et Yarn (pour le développement)
- Rust (si compilation depuis les sources)

### Télécharger les binaires pré-compilés

1. Visitez la page [Releases](https://github.com/downly-app/ollama.vip/releases)
2. Téléchargez l'installateur approprié pour votre plateforme :

#### Windows
- **Installateur MSI** : `ollama-pro_x.x.x_x64_en-US.msi` (recommandé)
- **Installateur NSIS** : `ollama-pro_x.x.x_x64-setup.exe`

#### macOS
- **Paquet DMG** : `ollama-pro_x.x.x_x64.dmg` (Intel)
- **Paquet DMG** : `ollama-pro_x.x.x_aarch64.dmg` (Apple Silicon)
- **Bundle d'application** : `ollama-pro.app.tar.gz`

> [!WARNING]
> **Note spéciale pour macOS :**
> Si vous rencontrez une erreur « le fichier est endommagé » en essayant d'ouvrir l'application, veuillez exécuter la commande suivante dans votre terminal. Cela est dû au fait que l'application n'a pas été notariée par Apple.
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/ollama-pro.app
> ```
> *Remplacez `/Applications/ollama-pro.app` par le chemin réel de l'application si vous l'avez installée ailleurs.*

#### Linux
- **Paquet Debian** : `ollama-pro_x.x.x_amd64.deb` (Ubuntu/Debian)
- **Paquet RPM** : `ollama-pro_x.x.x_x86_64.rpm` (RHEL/Fedora/SUSE)
- **AppImage** : `ollama-pro_x.x.x_amd64.AppImage` (universel)

### Compilation depuis les sources

```bash
# Cloner le dépôt
git clone https://github.com/downly-app/ollama.vip.git
cd ollama.vip

# Installer les dépendances
yarn install

# Démarrer le serveur de développement
yarn tauri:dev

# Compilation pour la production
yarn tauri:build

# Ou utiliser les scripts de compilation spécifiques à la plateforme
# Windows
yarn build:all

# Linux/macOS
yarn build:all:unix
```

### Compilation automatique

Nos GitHub Actions compilent automatiquement les releases pour toutes les plateformes supportées :
- ✅ Windows (x64)
- ✅ macOS (Intel & Apple Silicon)
- ✅ Linux (x64)

Toutes les compilations sont :
- 🔒 **Signées numériquement** (quand les certificats sont disponibles)
- 🛡️ **Scannées pour la sécurité** (vérification des vulnérabilités)
- 📦 **Optimisées** (taille et performance)
- 🧪 **Testées** (validation sur plusieurs environnements)

## 🚀 Démarrage rapide

1. **Installer et lancer** : Télécharger et installer l'application pour votre plateforme
2. **Configurer l'API** : Ouvrir les paramètres et ajouter vos clés API de fournisseurs IA
3. **Sélectionner un modèle** : Choisir votre modèle IA préféré dans le menu déroulant
4. **Commencer à chatter** : Démarrer une conversation avec votre assistant IA

## 📁 Structure du projet

```
ollama.vip/
├── src/                    # Code source frontend
│   ├── components/         # Composants React
│   │   ├── ui/            # Composants UI de base
│   │   ├── layouts/       # Composants de mise en page
│   │   └── ...
│   ├── pages/             # Composants de page
│   ├── stores/            # Gestion d'état Zustand
│   ├── services/          # Services API
│   ├── utils/             # Fonctions utilitaires
│   ├── contexts/          # Contextes React
│   ├── i18n/              # Internationalisation
│   │   └── locales/       # Fichiers de traduction
│   └── styles/            # Styles CSS
├── src-tauri/             # Backend Tauri
│   ├── src/               # Code source Rust
│   ├── Cargo.toml         # Dépendances Rust
│   └── tauri.conf.json    # Configuration Tauri
├── public/                # Assets statiques
└── docs/                  # Documentation
```

## 🔧 Configuration

### Configuration API
1. Ouvrir l'application
2. Cliquer sur l'icône paramètres dans la barre d'outils
3. Configurer les fournisseurs et clés API :
    - **OpenAI** : Entrer votre clé API OpenAI
    - **DeepSeek** : Entrer votre clé API DeepSeek
4. Sélectionner votre modèle préféré
5. Ajuster la température et autres paramètres

### Paramètres de langue
L'application supporte plusieurs langues :
- Anglais (par défaut)
- Chinois (simplifié)
- Japonais
- Coréen
- Français

Changez la langue dans Paramètres > Paramètres de langue.

## 🛠️ Développement

### Stack technologique
- **Frontend** : React 18.3 + TypeScript 5.5
- **Backend** : Tauri 1.5 + Rust
- **Framework UI** : Tailwind CSS + Radix UI
- **Gestion d'état** : Zustand
- **Outils de compilation** : Vite
- **Internationalisation** : react-i18next

### Outils de développement IA
- **Éditeurs de code** : WindSurf + Cursor + Trae AI
- **Design UI/UX** : Lovable
- **Recherche et analyse** : Manus
- **Modèles IA** : Claude 4 + Gemini 2.5 Pro
- **Approche de développement** : Vibe Coding (développement assisté par IA)

### Commandes de développement
```bash
# Démarrer le serveur de développement
npm run dev

# Démarrer le développement Tauri
npm run tauri dev

# Compilation pour la production
npm run tauri build

# Vérification des types
npm run type-check

# Linting
npm run lint

# Formatage du code
npm run format
```

### Ajouter de nouvelles fonctionnalités
1. Créer des composants dans `src/components/`
2. Ajouter des pages dans `src/pages/`
3. Gérer l'état avec les stores Zustand dans `src/stores/`
4. Ajouter des traductions dans `src/i18n/locales/`
5. Mettre à jour les types dans les fichiers `.d.ts` appropriés

## 📖 Documentation API

### API de chat
L'application supporte plusieurs fournisseurs IA :

#### OpenAI
- Modèles : GPT-4o, GPT-4o Mini, GPT-4 Turbo
- Point de terminaison : `https://api.openai.com/v1/chat/completions`

#### DeepSeek
- Modèles : DeepSeek-V3, DeepSeek-R1
- Point de terminaison : `https://api.deepseek.com/v1/chat/completions`

### Format de configuration
```typescript
interface AIConfig {
  provider: 'openai' | 'deepseek';
  apiKey: string;
  model: string;
  temperature: number;
}
```

## 🧪 Tests

```bash
# Exécuter les tests unitaires
npm run test

# Exécuter les tests d'intégration
npm run test:integration

# Exécuter les tests E2E
npm run test:e2e
```

## 📦 Compilation et distribution

### Compilation de développement
```bash
npm run tauri dev
```

### Compilation de production
```bash
npm run tauri build
```

Les artefacts de compilation sont générés dans `src-tauri/target/release/bundle/`.

### Notes spécifiques aux plateformes
- **Windows** : Génère un installateur `.msi`
- **macOS** : Génère des bundles `.dmg` et `.app`
- **Linux** : Génère `.deb` et `.AppImage`

## 🔍 Dépannage

### Problèmes courants

1. **Le port 1421 est déjà utilisé**
   ```bash
   # Tuer le processus utilisant le port
   npx kill-port 1421
   # ou
   lsof -ti:1421 | xargs kill -9
   ```

2. **Échec de compilation Tauri**
    - Vérifier que Rust est correctement installé
    - Mettre à jour Tauri CLI : `cargo install tauri-cli`
    - Nettoyer le cache : `cargo clean`

3. **Problèmes de connexion API**
    - Vérifier que les clés API sont correctes
    - Vérifier la connexion réseau
    - Vérifier que les points de terminaison API sont accessibles

### Mode débogage
Activer le mode débogage en définissant des variables d'environnement :
```bash
TAURI_DEBUG=true npm run tauri dev
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez consulter notre [Guide de contribution](../../docs/en/CONTRIBUTING.md) pour plus de détails.

### Flux de travail de développement
1. Forker le dépôt
2. Créer une branche de fonctionnalité
3. Apporter vos modifications
4. Ajouter des tests si applicable
5. Soumettre une pull request

### Style de code
- Utiliser TypeScript pour la sécurité des types
- Suivre la configuration ESLint
- Utiliser Prettier pour le formatage du code
- Écrire des messages de commit significatifs

## 📄 Licence

Ce projet est sous licence GNU General Public License v3 avec exception commerciale.

### Utilisation open source
Pour un usage non commercial (personnel, éducatif, recherche), ce logiciel est disponible sous les termes GPL v3.

### Utilisation commerciale
L'utilisation commerciale nécessite une licence commerciale séparée. Contactez [yzmm@outlook.com] pour les licences commerciales.

Voir le fichier [LICENSE](../../LICENSE) pour plus de détails.

## 🙏 Remerciements

### Frameworks et bibliothèques
- [Tauri](https://tauri.app/) - Framework d'application de bureau fantastique
- [React](https://reactjs.org/) - Bibliothèque UI
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utility-first
- [Radix UI](https://www.radix-ui.com/) - Composants UI accessibles
- [Zustand](https://github.com/pmndrs/zustand) - Gestion d'état

### Outils de développement IA
- [WindSurf](https://codeium.com/windsurf) - Éditeur de code piloté par l'IA
- [Cursor](https://cursor.sh/) - Éditeur de code AI-first
- [Trae AI](https://trae.ai/) - Assistant de codage IA avancé
- [Lovable](https://lovable.dev/) - Design UI/UX piloté par l'IA
- [Manus](https://manus.ai/) - Plateforme de recherche et d'analyse IA
- [Claude 4](https://claude.ai/) - Modèle de langage IA avancé d'Anthropic
- [Gemini 2.5 Pro](https://gemini.google.com/) - Modèle IA avancé de Google

### Philosophie de développement
Ce projet démontre la puissance du **développement assisté par l'IA** (vibe coding), où la créativité humaine et les capacités de l'IA collaborent pour créer des solutions logicielles innovantes.

## Support

Si vous rencontrez des problèmes ou avez des questions :
- Créer un problème sur [GitHub Issues](https://github.com/downly-app/ollama.vip/issues)
- Consulter la [documentation](docs/)
- Rejoindre les discussions communautaires
- Pour les licences commerciales : [yzmm@outlook.com]