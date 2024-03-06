# Traefik

Dieses Repository beinhaltet den Code, um Traefik auf dem Server zu konfigurieren.
Bevor Traefik gestartet werden kann, muss die ````example.env```` zu ```.env``` kopiert und ausgefüllt werden.
Die Datei ````services.example.js```` sollte in eie Datei ```services.js``` kopiert werden. In dieser Datei sind die Definition der Services, welche vom Generator benutzt werden.
Wichtig hierbei ist, dass wenn Services die ForwardAuth Middleware benutzen, sollte der Service ````authentication```` aus der ```services.example.js``` übernommen werden. Wenn das Dashboard erreichbar sein soll, ist bei der Servicedefinition daruf zu achten, dass dieser in der URL unter einer Root Domain läuf, also keine Pfad Parameter hat. Eine Subdomain ist hierbei jedoch zulässig. Beispiel für korrekt konfigurierte Dashboards sind ````localhost```` oder ```subDomain.localhost```.
Dabei ist jeder Service ein JS Objekt mit folgenden Attributen:
- name: Name des Service (hieraus werden die prefixes generiert)
- entrypoints: Das Protokoll, über welches der Service ansprechbar ist. Es gibt zwei Optionen
    - ENTRYPOINTS.WEB_SECURE: HTTPS (443)
    - ENTRYPOINTS.WEB: HTTP (80)
- url: Die URL-Pfadelemente unter dem der Service ansprechbar ist. Diese werden bei Generierung der Traefik Konfiguration mit einem ````/```` zu einem String zusammengefügt.
- servers: Der Hostname und Port der Container in denen der Service läuft als Url: ````http:<CONTAINER_NAME>:<CONTAINER_PORT>````
- middlewares: Ein Array an Middlewares für den Service. Alle vorhandenen Middlewares können in der Datei ````generator/persistence.js```` eingesehen werden.
- useTls: Ein Boolean Wert, ob der Service TLS nutzen soll

## Vorkonfigurierte Services
Von Haus aus sind in diesem Projekt drei Services vorkonfiguriert:
1. dashboard: Das Dashboard von Traefik. Standardmaessig erreichbar unter dem Root der Domain ````/````
2. traefikAuth: Der Service zum Verabeiten der Authentifizierungen gegenüber Traefik. Standardmaessig erreichbar unter ````/auth````

Diese beiden Services können, auch nur in teilen, in der Datei ````services.js```` überschrieben werden, indem ein Service mit gleichem Namen definiert wird. Alle Keys, welche in dem vordefinierten Service existieren werden dabei von den Keys des benutzer definierten Services überschrieben. Array Objekte werden hierbei zusammengeführt und nicht einfach ersetzt.

## Datenbank
Neben den beiden vorkonfigurierten Services stellt dieses Projekt eine Datenbank bereit, um die authentifizierten User zu speichern. Diese Datenbank kann von anderen Services mit dem Connection String genutzt werden:
````js 
`mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@traefikDB:27017`
```` 
Die Datenbank stellt selber kein UI bereit, sondern verlässt sich darauf, dass der Nutzer selbst eins mitbringt. Um sich auf die MongoDB Instanz zu verbinden, empfiehlt sich das Programm [MongoDB Compass](https://www.mongodb.com/try/download/compass).
Um die Verbindung herzustellen, muss im Connection String das Protokoll gefolgt von der Domain und dem Port 27012 eingegeben werden ````mongodb://${DOMAIN}:27012````. Unter Erweiterten Optionen muss der Nutzer und das Passwort eingegeben werden.

## ./start.sh
Das Skript muss unter Umständen nach dem ersten Pullen ausführbar gemacht werden: ````chmod +x ./start.sh````.
Das Startskript bietet neben dem Starten von Traefik und dem Traefik Auth Service weitere Befehle yur Verfügung:
 - ````generate````: führt nur die Erstellung der dynamischen Traefik Konfiguration aus
 - ````down````: fährt den Traefik und Traefik Auth Container herunter

Das Startverhalten von Traefik kann durch folgende Parameter beeinflusst werden:
 - ````--force | -f````: Erzwingt einen kompletten Neubau aller Traefik Container
 - ````--network | -n````: Konfiguriert den angegebenen Namen als Netzwerkname für das Traefik Netzwerk. Standardwert ist ```traefik```
 - ````--project | -p````: Konfiguriert den angegebenen Namen als Projektnamen für die Traefik Container. Standardwert ist hier der Netzwerkname

## Fehlerbehebung
Falls beim Aufrufen einer Route nichts passiert, bitte die Datei ````logs/traefik.log```` überprüfen. Der Fehler, dass ein certresolver nicht existiert ist in einer Umgebung mit self-signed Certificates zu erwarten und behindert nicht die Funktionalität des Programmes