<?php
// Poptávkový formulář webu EuroDejv: pošle poptávku e-mailem a vrátí návštěvníka zpět na stránku s formulářem.
// Adresu příjemce vloží build.js z content/nastaveni.json (pole „E-mail“).
$komu = '__EMAIL__';

function pole($k, $max) {
  $v = (string)($_POST[$k] ?? '');
  $v = str_replace(["\r", "\0"], '', $v);
  return trim(mb_substr($v, 0, $max, 'UTF-8'));
}
// Návrat jen na stránku tohoto webu
$zpet = pole('zpet', 200);
if (!preg_match('~^/[a-z0-9/_-]*$~', $zpet) || strpos($zpet, '//') !== false) $zpet = '/kontakt/';
$zpet = rtrim($zpet, '/') . '/';
if ($zpet === '//') $zpet = '/';
$vysledek = function ($q) use ($zpet) { header('Location: ' . $zpet . '?' . $q . '#poptavka', true, 303); exit; };

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') $vysledek('chyba=1');
if (pole('web', 200) !== '') $vysledek('odeslano=1'); // vyplnil skryté pole = robot, tváříme se, že je odesláno

$jmeno = str_replace("\n", ' ', pole('jmeno', 120));
$telefon = str_replace("\n", ' ', pole('telefon', 40));
$email = str_replace("\n", '', pole('email', 160));
$misto = str_replace("\n", ' ', pole('misto', 160));
$tema = str_replace("\n", ' ', pole('tema', 120));
$termin = str_replace("\n", ' ', pole('termin', 120));
$polozky = pole('polozky', 2000);
$zprava = pole('zprava', 5000);

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $vysledek('chyba=1');
if ($jmeno === '' || ($zprava === '' && $polozky === '') || ($email === '' && $telefon === '')) $vysledek('chyba=1');

$predmet = 'Poptávka z webu' . ($tema !== '' ? ': ' . $tema : '') . ' – ' . $jmeno;
$telo = "Poptávka z webu eurodejv.cz\n\n"
  . "Jméno: $jmeno\nTelefon: $telefon\nE-mail: $email\nObec: $misto\nTermín: $termin\nTéma: $tema\nOdesláno ze stránky: $zpet\n\n"
  . ($polozky !== '' ? "Vybráno z půjčovny:\n$polozky\n\n" : '')
  . "$zprava\n";
$hlavicky = "From: Web EuroDejv <$komu>\r\n"
  . ($email !== '' ? "Reply-To: $email\r\n" : '')
  . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n";
// Zpáteční adresa (return-path) musí být na naší doméně, jinak Wedos pošle e-mail jako svůj server
// a Google ho kvůli SPF může dát do spamu (návod Wedosu: kb.wedos.com, „E-maily – SPF, DKIM a DMARC“).
// K tomu v DNS domény eurodejv.cz patří include:_spf.we.wedos.net (viz README, část Přepnutí domény).
$ok = mail($komu, '=?UTF-8?B?' . base64_encode($predmet) . '?=', $telo, $hlavicky, '-f' . $komu);
$vysledek($ok ? 'odeslano=1' : 'chyba=2');
