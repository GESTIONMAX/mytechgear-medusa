# Vérification de la Purge - MyTechGear

## Étape 1 : Vider le Cache Navigateur

1. Ouvrir https://api.mytechgear.eu/app/products
2. Faire un **Hard Refresh** :
   - Windows/Linux : `Ctrl + Shift + R`
   - Mac : `Cmd + Shift + R`
3. Ou ouvrir en navigation privée pour voir sans cache

## Étape 2 : Redémarrer le Serveur Medusa

```bash
# Si Medusa tourne en dev mode
# Arrêter (Ctrl+C) puis relancer :
npm run dev

# Ou redémarrer le service Docker/Coolify
```

## Étape 3 : Vérifier la Base de Données Directement

Le snapshot confirme que les images ont été supprimées :
- Snapshot 18:26 : 1,161 images ✅
- Snapshot 18:34 : 0 images ✅
- Purge LIVE : Rien trouvé (déjà supprimé)

## Étape 4 : Vérifier les Fichiers Physiques

Les fichiers physiques existent toujours dans :
```
/home/gestionmax-aur-lien/CascadeProjects/mytechgear/mytechgear-medusa/static/
```

Ces fichiers ne sont PAS supprimés par le script (seulement les références DB).

## Étape 5 : Tester l'API Directement

```bash
# Vérifier qu'un produit n'a plus d'images via l'API
curl https://api.mytechgear.eu/store/products/prime | jq '.product | {title, thumbnail, images}'
```

Résultat attendu :
```json
{
  "title": "Prime",
  "thumbnail": null,
  "images": []
}
```

## État Actuel ✅

- ✅ Références DB supprimées (snapshot 18:34 confirme)
- ✅ Purge exécutée avec succès (0 modifications car déjà fait)
- ⏳ Cache navigateur/serveur peut montrer encore les anciennes images
- ℹ️ Fichiers physiques `/static/` toujours présents (normal)

## Si les Images Persistent Après Cache Clear

Cela signifierait que les images viennent d'une autre source.
Vérifier :
1. D'où vient l'interface admin (Medusa natif ou dashboard custom ?)
2. Y a-t-il un cache CDN/Nginx/Coolify ?
3. Les images viennent-elles de MinIO directement ?
