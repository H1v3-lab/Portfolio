# Hydra : une cyberdéfense autonome, bio-inspirée et souveraine

Oct 14, 2026 · @Dominique

## Pourquoi Hydra existe

En 2025, Kaspersky a recensé plus de 92 millions de cybermenaces rien qu'en Afrique de l'Ouest. Ramené à l'échelle d'une année, cela fait près de trois menaces détectées chaque seconde dans notre région.

Face à ce volume, la plupart des organisations africaines n'ont ni centre opérationnel de sécurité (SOC) ouvert 24 h/24, ni les analystes pour le faire tourner. Les solutions disponibles sont majoritairement occidentales : chères, facturées en devises, et souvent hébergées hors du continent.

Hydra est né de ce constat. Plutôt que d'ajouter un outil de plus qu'il faudrait surveiller, nous avons voulu construire un système qui surveille, comprend et réagit de lui-même, et qui reste chez nous.

## Hydra en une phrase

Hydra (Hyper-Dynamic Responsive AI) est une plateforme de cybersécurité autonome et bio-inspirée qui attaque, détecte, trompe et enquête, dans une seule boucle automatisée.

Le nom vient de l'Hydre de Lerne, la créature mythologique à plusieurs têtes. Chaque tête de notre Hydra est un module spécialisé, mais toutes partagent le même corps : un bus de messages commun et une même mémoire de l'attaque. Couper une tête ne suffit pas à abattre la bête.

L'autre source d'inspiration, c'est le corps humain. Notre système immunitaire ne connaît pas à l'avance tous les virus ; il apprend ce qu'est le « soi » et réagit à tout ce qui s'en écarte. Hydra applique la même logique au réseau : apprendre ce qu'est un trafic sain, puis isoler ce qui ne l'est pas, même face à une attaque jamais vue.

Concrètement, Hydra raconte l'histoire complète d'une intrusion, de sa première requête jusqu'à sa « digestion » :

1. **Aegis** attaque, comme le ferait un pirate.
2. **Neuro-Sentinel** détecte l'anomalie et riposte.
3. **Neural-Deception** enferme l'attaquant dans un labyrinthe de leurres.
4. **Oracle-Forensics** rembobine l'attaque, l'explique et propose le correctif.

## L'architecture : une seule boucle

Les quatre modules de Hydra ne sont pas des outils juxtaposés : ils forment une boucle fermée où chaque attaque nourrit la défense suivante.

<div id="hydra-arch"></div>

Tout passe par un bus Redis en publication/abonnement : un module publie un événement (flux suspect, riposte, action de l'attaquant), les autres l'écoutent et réagissent. Les interfaces humaines se branchent sur ce même bus, sans ralentir la boucle automatique.

## Aegis : l'attaquant qui raisonne

Aegis est un agent de test d'intrusion autonome : on lui donne une cible, il mène le pentest de bout en bout sans intervention humaine.

Il ne se contente pas de scanner des ports. Il lit les résultats, choisit l'exploit le plus pertinent, l'exécute, et s'il échoue, il change d'approche : contournement d'un WAF, autre vecteur, tentative d'escalade de privilèges. Toute sa réflexion est exposée en langage naturel (« je vois un port 80 ouvert, je tente une injection SQL… échec, je modifie le payload »), ce qui en fait aussi un formidable outil pédagogique.

Nous avons fait le choix de l'honnêteté technique : Aegis est construit sur le framework open source PentAGI, que nous avons intégré et piloté plutôt que réécrit de zéro. Il tourne dans des conteneurs Docker et expose une API REST (création de *flows* de pentest) que le reste de Hydra peut appeler. Le raisonnement est assuré par un LLM servi via Ollama.

Pourquoi un attaquant dans un outil de défense ? Parce qu'on ne protège bien que ce qu'on a déjà attaqué soi-même. Aegis sert à la fois à auditer en continu l'infrastructure du client et à générer le trafic offensif qui entraîne et teste Neuro-Sentinel.

## Neuro-Sentinel : un système immunitaire pour le réseau

Neuro-Sentinel est le cœur défensif de Hydra : un système de détection et de prévention d'intrusion (IDS/IPS) qui ne repose pas sur des signatures, mais sur la connaissance du comportement normal.

### Apprendre le « soi »

Au démarrage, Neuro-Sentinel observe le réseau pendant une phase d'apprentissage et construit son modèle du trafic sain. Ensuite, tout flux qui s'en écarte reçoit un score d'anomalie.

La détection s'inspire de l'algorithme de sélection négative (NSA), issu des systèmes immunitaires artificiels : comme les lymphocytes, des « détecteurs » sont entraînés à ne pas réagir au soi. En pratique, nous le combinons à un Isolation Forest et à un One-Class SVM (via PyOD), pour compenser les limites du NSA dans les espaces de grande dimension.

### Décider seul

La décision de riposte est confiée à un agent d'apprentissage par renforcement (PPO, stable-baselines3), encadré par des règles de sécurité basées sur le score d'anomalie et le volume de paquets. Ce mode hybride évite qu'un agent mal entraîné reste bloqué sur une seule action.

### Riposter de façon graduée

Comme le corps, Hydra ne sort pas l'artillerie lourde pour un simple éternuement. La réponse est graduée :

| Niveau | Réponse | Effet |
| --- | --- | --- |
| 0 | Journalisation | L'événement est enregistré et surveillé |
| 1 | Quarantaine | Le conteneur suspect est isolé du réseau |
| 2 | Bannissement | L'IP source est bloquée (iptables), avec expiration automatique |
| 3 | Redirection | Le trafic est dévié vers un honeypot (DNAT) |

Chaque action déclenche l'Alert Manager : notification Discord, e-mail HTML détaillé avec recommandations de remédiation, et rapport PDF en pièce jointe.

En laboratoire, le pipeline a été validé de bout en bout : lors d'un scan nmap lancé depuis le conteneur attaquant, Neuro-Sentinel l'a détecté puis mis en quarantaine, rendant la cible injoignable. Sur un test de plus de 2,5 millions de flux analysés, il a levé 3 alertes et procédé à 3 mises en quarantaine.

## Neural-Deception : le labyrinthe de miroirs

Neural-Deception part d'une idée simple : la meilleure défense, c'est parfois de faire perdre son temps à l'attaquant.

Plutôt que de couper brutalement la connexion, ce qui alerte le pirate, Hydra le redirige discrètement vers un environnement leurre. Il pense avoir trouvé la base clients ; en réalité, il exfiltre du bruit pendant que la vraie défense l'observe.

Aujourd'hui, ce leurre est un honeypot générique placé dans la DMZ, vers lequel Neuro-Sentinel bascule le trafic au niveau 3 de la riposte. La vision cible va plus loin : utiliser un LLM pour générer à la volée de faux répertoires, de faux serveurs et des millions de faux enregistrements assez crédibles pour tromper un humain comme un scanner automatisé.

Ce que l'attaquant fait dans le leurre n'est pas perdu. Ses commandes, ses outils et ses techniques alimentent directement Oracle, et enrichissent la détection future.

## Oracle-Forensics : rembobiner l'attaque

Oracle est le module qui transforme une attaque subie en connaissance : il reconstruit la chronologie exacte de l'intrusion et propose le correctif.

Après un incident, une enquête forensique classique peut prendre des semaines : collecter les journaux, les corréler, comprendre le point d'entrée, retracer les mouvements du pirate. Oracle vise à ramener ce délai à quelques minutes, en corrélant automatiquement ce que savent déjà les autres têtes de Hydra : les actions d'Aegis, les alertes de Neuro-Sentinel et le comportement observé dans le leurre.

L'indicateur qui guide sa conception est le MTTU (*Mean Time to Understand*), le temps moyen nécessaire pour comprendre un incident. L'expérience visée est celle d'un écran à la *Minority Report* : une timeline que l'on peut rembobiner étape par étape, une IA qui explique chaque geste de l'attaquant, la faille initiale identifiée, la prochaine cible probable anticipée, et un bouton « Generate Patch » pour boucher la brèche.

## Voir et piloter Hydra

Une défense autonome doit rester lisible pour les humains qui en sont responsables. Hydra s'accompagne donc de trois interfaces.

**Le Command Center.** Un tableau de bord web, alimenté en temps réel par WebSocket, où un bouton « Run Intrusion » déroule le scénario complet : le raisonnement d'Aegis, la carte du réseau avec le serveur compromis puis isolé, l'électrocardiogramme et le score d'anomalie de Neuro-Sentinel, le compteur de faux enregistrements de Neural-Deception, et la timeline rembobinable d'Oracle.

**La Threat Map.** Un globe 3D aux vrais contours des continents, sur lequel s'affichent en direct les arcs d'attaque source-cible, un journal de détection, le classement des pays et des filtres par type de menace (ransomware, DDoS, phishing). C'est la vue « salle de crise » de Hydra.

**Le pilote vocal.** Un copilote à la façon de JARVIS, qui fait un brief vocal des alertes et accepte des ordres oraux : résumer la situation, lancer un pentest Aegis ou activer une riposte. Il fonctionne avec une transcription locale (faster-whisper sur GPU), un LLM pour comprendre l'intention, et une synthèse vocale française (Piper). Exemple de réponse réelle obtenue en test : « Neuro-Sentinel a détecté 3 alertes sur 2 509 611 flux analysés, 3 quarantaines, 0 bannissements, 0 redirections honeypot. »

## Une réponse africaine, souveraine et accessible

Hydra n'est pas qu'une prouesse technique : c'est un positionnement. Nous voulons que la cyberdéfense des institutions africaines puisse être conçue, hébergée et maîtrisée sur le continent.

Quatre choix structurent ce positionnement :

- **Architecture ouverte.** Hydra s'appuie sur des briques open source et reste auditable.
- **Hébergement local.** Déploiement sur site (on-premise) ou sur un cloud souverain africain ; les données sensibles ne quittent pas le pays.
- **Automatisation de la boucle.** Détection, riposte, leurre et enquête s'enchaînent sans intervention, ce qui réduit le besoin d'une équipe SOC 24/7, rare et coûteuse en Afrique francophone.
- **Coûts adaptés au marché local.** Pas de licences facturées en devises au tarif occidental.

Notre cible prioritaire est le B2G et les institutions critiques : ministères, agences de cybersécurité, banques et institutions financières, opérateurs télécoms, d'abord dans l'espace UEMOA/CEMAC.

Le modèle économique est un abonnement par infrastructure protégée, dès 250 000 FCFA par mois, mise en place et formation des équipes incluses. S'y ajoutent le support avec engagements de service et, à terme, une offre de *threat intelligence* mutualisée : chaque attaque observée chez un client, une fois anonymisée, renforce la détection de tous les autres.

Un point de vigilance que nous assumons : pour la démonstration, certains modèles de langage tournent via des services cloud. Une version souveraine de production devra s'appuyer sur des modèles hébergés localement.

## Où en est Hydra aujourd'hui

Hydra est aujourd'hui un prototype fonctionnel en laboratoire : deux modules tournent réellement, les deux autres sont à l'état de conception ou de première version.

| Composant | État | Ce qui fonctionne |
| --- | --- | --- |
| Aegis | Opérationnel en labo | Pentests autonomes lancés via l'API PentAGI |
| Neuro-Sentinel | Opérationnel en labo | Détection hybride, riposte graduée, alertes et rapports PDF |
| Neural-Deception | Première version | Redirection vers un honeypot générique ; génération par LLM à venir |
| Oracle-Forensics | En conception | Architecture définie ; prototype visuel dans le Command Center |
| Command Center et Threat Map | Démonstrateur | Scénario d'intrusion complet joué de bout en bout |
| Pilote vocal | Prototype | Brief vocal et commandes validés en conditions réelles |

Le laboratoire simule une petite infrastructure sous Docker, avec une DMZ et un réseau interne séparés. Les modules communiquent par un bus Redis en publication/abonnement, ce qui permet d'ajouter une nouvelle tête sans toucher aux autres.

Hydra est aussi notre projet de fin d'études en licence professionnelle Réseaux, Systèmes et Sécurité à IPNET Institute of Technology (Lomé), et il a été présenté aux Journées Portes Ouvertes (JPOPE) 2026.

## Perspectives : vers où va Hydra

La prochaine étape est de faire passer Hydra du laboratoire au terrain, avec un déploiement pilote auprès d'institutions partenaires. Pour y arriver, nous avons trois horizons.

### Compléter les quatre têtes

- **Oracle-Forensics** : implémenter le moteur de corrélation, la timeline rembobinable image par image et la génération automatique de correctifs.
- **Neural-Deception génératif** : passer du honeypot générique à des leurres créés à la volée par un LLM, adaptés à ce que l'attaquant cherche.
- **Câbler le Command Center** sur les vrais moteurs, pour que chaque écran reflète l'état réel du réseau et non plus un scénario joué.

### Rendre Hydra plus fort et plus souverain

- Héberger les modèles de langage localement, pour supprimer toute dépendance à un service cloud étranger.
- Étendre Aegis à des scénarios de pentest plus complexes : mouvements latéraux, Active Directory, applications web modernes.
- Entraîner Neuro-Sentinel face à des attaques polymorphes, qui modifient leur code pour échapper à la détection.
- Étendre le pilote vocal en assistant multicanal, accessible depuis un téléphone pour l'équipe d'astreinte.
- Localiser entièrement l'interface en français.

### Sortir du laboratoire

- Mener un déploiement pilote avec des institutions de l'espace UEMOA/CEMAC.
- Construire la *threat intelligence* mutualisée et anonymisée entre clients.
- S'intégrer aux outils déjà présents chez les clients (pare-feux, SIEM) et s'aligner sur les référentiels ISO/CEI 27000.

À long terme, notre ambition est que Hydra devienne une brique de la souveraineté numérique de nos pays : une cyberdéfense conçue en Afrique, pour les réalités africaines.

## Pour conclure

Hydra est parti d'une question d'étudiants : peut-on construire, depuis Lomé, une cyberdéfense qui observe, apprend et réagit seule, sans dépendre d'une équipe SOC introuvable ni d'un éditeur étranger ? Le prototype montre que oui, au moins en laboratoire.

Le chemin vers le terrain est encore long, et nous le savons. Mais chaque tête ajoutée à l'Hydre rapproche ce projet de son objectif : donner à l'Afrique sa propre cyberdéfense, intelligente, souveraine et accessible.

Hydra est porté par une équipe de trois :

- **Dominique-Savio SAKOI** : chef de projet et développement IA
- **Romaric** : intégration technique
- **Emmanuel** : réseau et animation visuelle

Vous êtes une institution, une entreprise ou un chercheur intéressé par un pilote ou une collaboration ? Écrivez-nous.
