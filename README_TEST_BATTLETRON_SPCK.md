# CARISTE RUNNER — TEST BATTLETRON / SPCK (V1)

Ceci est une copie d'essai isolée de la branche principale, pour tester la manette Battletron sur Android ou PC.

## Installation dans SPCK
1. Télécharge l'archive ZIP de la branche de test.
2. Décompresse les fichiers dans un projet SPCK (le dossier contenant index.html doit être la racine du projet).
3. Ouvre index.html pour conserver l'intro, ou accueil.html pour lancer directement le jeu.
4. Connecte ta manette Bluetooth avant de lancer l'aperçu. Appuie sur un bouton.
5. Si l'aperçu interne SPCK ne reconnaît pas la Gamepad API, ouvre l'aperçu dans Chrome sur un site HTTPS ou localhost.
6. Appuie sur « 🎮 Manette ? » pour lire l'identifiant Gamepad, les boutons actifs et les axes. Touche une action puis presse son bouton pour le calibrer.

## Contrôles par défaut (à confirmer sur ta manette)
- A/Croix : saut ; R2 : saut alternatif
- Y/Triangle : jouer ; X/Carré : rejouer
- Options : pause ; Share : classement
- Croix directionnelle gauche/droite : musique précédente/suivante
- Croix directionnelle haut/bas : musique lecture/stop
- L1/R1 : volume -/+
- L2 : chat de démonstration ; L3 : curseur virtuel ; R3 : plein écran
- Dans le chat test : joystick gauche et flèches = lettres, A = écrire, B = effacer, R2 = envoyer le message (test), L2 = fermer
- Clic du pavé tactile si reconnu (index 17 par défaut) ou L3 : afficher/masquer le clavier
- PC : F8 = diagnostic manette ; F9 = chat de démonstration

## Points importants
- Le jeu existant, le tactile Android, la souris et le clavier PC restent inchangés.
- Les boutons Battletron ne sont pas garantis à leurs positions standard : calibrage intégré dans le panneau.
- Les commandes nécessitant une activation navigateur directe (plein écran, lancement audio) peuvent demander un clic tactile initial.
- Le chat de démonstration est LOCAL : ses messages ne vont pas dans le vrai chat.
- Le vrai chat Google Apps Script garde son bouton actuel. La saisie à la manette dans ce chat réel exigera une modification ultérieure de l'interface Apps Script, sur sa propre copie de test.
- Le classement, le pseudo et le chat réel continuent à utiliser leurs services distants existants si tu choisis de les ouvrir ; ils ne sont pas simulés.
- Ne pas modifier ou déployer la branche main. Les tests restent sur cette branche isolée.

Fichiers ajoutés : gamepad-main.js et gamepad-chat-test.js. Fichiers locaux modifiés : accueil.html et service-worker.js.
