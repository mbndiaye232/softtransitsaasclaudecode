@echo off
REM Copie automatique des screenshots + logo vers le dossier public/ de Remotion
REM A executer depuis le dossier video/

echo Copie des screenshots vers public/...
copy /Y "..\screenshots\EcranAccueil.png"          public\ >nul
copy /Y "..\screenshots\EcranClient.png"           public\ >nul
copy /Y "..\screenshots\EcranDossiers.png"         public\ >nul
copy /Y "..\screenshots\EranNoteDetails.png"       public\ >nul
copy /Y "..\screenshots\EcranFacturation.png"      public\ >nul
copy /Y "..\screenshots\EcranReglements.png"       public\ >nul
copy /Y "..\screenshots\EcranSuiviTraitements.png" public\ >nul
copy /Y "..\screenshots\EcranEtatsFinanciers.png"  public\ >nul
copy /Y "..\screenshots\EcranOT.png"               public\ >nul
copy /Y "..\screenshots\EcranParametresSysteme.png" public\ >nul

echo.
echo /!\ Placez votre logo SST en PNG sous : video\public\logo-sst.png
echo.
echo Termine. Vous pouvez maintenant lancer :
echo    npm install
echo    npm start         (mode studio interactif)
echo    npm run render    (genere out\softtransit-promo.mp4)
pause
