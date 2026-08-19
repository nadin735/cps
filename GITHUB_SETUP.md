# GitHub Setup, Schritt für Schritt

Diese Anleitung geht davon aus, dass du einen GitHub-Account hast und Git auf deinem Rechner installiert ist (prüfen mit `git --version` im Terminal, falls das einen Fehler wirft, zuerst Git installieren).

## 1. Neues, leeres Repository auf GitHub anlegen

1. Gehe zu [github.com/new](https://github.com/new)
2. Repository-Name: zum Beispiel `critical-path-scanner`
3. Sichtbarkeit: Public (damit Recruiter es ohne Einladung sehen können) oder Private, wie du magst
4. **Wichtig:** Häkchen bei "Add a README file", ".gitignore" und "license" NICHT setzen, das Projekt bringt bereits alles mit
5. Auf "Create repository" klicken

GitHub zeigt dir danach eine Seite mit Befehlen, genau die folgenden Schritte machen das gleiche, nur ausführlicher erklärt.

## 2. Projekt lokal entpacken

Entpacke die ZIP-Datei irgendwo auf deinem Rechner, zum Beispiel in `~/Projekte/critical-path-scanner`. Öffne danach ein Terminal in genau diesem Ordner (der Ordner, in dem `package.json` liegt).

## 3. Git im Projektordner initialisieren

```bash
cd pfad/zu/critical-path-scanner
git init
git add .
git commit -m "Initial commit: Critical Path Scanner"
```

## 4. Mit dem GitHub-Repository verbinden

Ersetze `DEIN-USERNAME` durch deinen tatsächlichen GitHub-Benutzernamen:

```bash
git remote add origin https://github.com/DEIN-USERNAME/critical-path-scanner.git
git branch -M main
git push -u origin main
```

Beim ersten `git push` fragt Git nach deinen GitHub-Zugangsdaten. Seit 2021 akzeptiert GitHub kein normales Passwort mehr dafür, du brauchst entweder:

- **Ein Personal Access Token** (einfachster Weg): [github.com/settings/tokens](https://github.com/settings/tokens) → "Generate new token (classic)" → Scope `repo` ankreuzen → Token kopieren und beim Push statt des Passworts einfügen
- **Oder GitHub Desktop** (grafische Oberfläche statt Terminal): [desktop.github.com](https://desktop.github.com), dort kannst du dich normal per Browser-Login anmelden und musst dich nicht mit Tokens beschäftigen

## 5. Fertig, jetzt auf Vercel deployen

1. Gehe zu [vercel.com](https://vercel.com) und logge dich mit deinem GitHub-Account ein
2. "Add New Project" → das gerade gepushte Repository auswählen → "Import"
3. Vercel erkennt Vite automatisch, keine Einstellungen nötig
4. "Deploy" klicken, nach etwa einer Minute ist die App live unter einer `.vercel.app`-Adresse

## Änderungen später hochladen

Jedes Mal, wenn du am Code etwas änderst und das auf GitHub (und automatisch auch auf Vercel) aktualisieren willst:

```bash
git add .
git commit -m "Kurze Beschreibung was sich geändert hat"
git push
```

## Falls etwas schiefgeht

- **"fatal: not a git repository"**: du bist im falschen Ordner, `cd` in den Ordner mit `package.json`
- **"remote origin already exists"**: `git remote remove origin` und Schritt 4 wiederholen
- **Push wird abgelehnt / "failed to push"**: meistens fehlende oder falsche Zugangsdaten, Personal Access Token neu erstellen (siehe oben)
