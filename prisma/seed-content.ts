/**
 * Injects Terms of Service and Privacy Policy into the database.
 *
 * Before running, edit the OPERATOR_* constants below to match your data.
 *
 * Run:
 *   npx tsx prisma/seed-content.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const raw   = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const dbUrl = raw.startsWith('file:') ? raw.slice(5) : raw;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma  = new PrismaClient({ adapter });

const OPERATOR_NAME    = 'SpeechFlow sp. z o.o.';
const OPERATOR_ADDRESS = 'Warszawa';
const OPERATOR_EMAIL   = 'kontakt@speechflow.org';
const APP_URL          = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gra.speechflow.org';
const APP_NAME         = 'SpeechFlow – Gra Terenowa';

const REGULAMIN = /* html */`
<h2>§ 1. Postanowienia ogólne</h2>
<p>Niniejszy Regulamin określa zasady korzystania z aplikacji internetowej <strong>${APP_NAME}</strong>, dostępnej pod adresem <a href="${APP_URL}">${APP_URL}</a>, prowadzonej przez <strong>${OPERATOR_NAME}</strong> z siedzibą pod adresem ${OPERATOR_ADDRESS} (dalej: „Operator").</p>
<p>Korzystanie z aplikacji oznacza akceptację niniejszego Regulaminu w całości. Osoby niepełnoletnie mogą korzystać z aplikacji wyłącznie za zgodą rodziców lub opiekunów prawnych.</p>

<h2>§ 2. Opis aplikacji</h2>
<p>${APP_NAME} to logopedyczna gra terenowa polegająca na odkrywaniu miejsc istotnych logopedycznie poprzez skanowanie kodów QR. Za każde odkrycie użytkownik zdobywa punkty i odznaki. Nagrodą główną są 2 wejściówki na konferencję SpeechLab 2026. Aplikacja dostępna jest bezpłatnie.</p>

<h2>§ 3. Rejestracja i konto użytkownika</h2>
<p>Korzystanie z podstawowych funkcji aplikacji jest możliwe bez rejestracji (tryb gościa). Rejestracja konta pozwala na zapisanie postępów, uczestnictwo w rankingu i zdobywanie odznak.</p>
<p>Podczas rejestracji użytkownik podaje adres e-mail, hasło oraz opcjonalnie pseudonim i miejscowość. Podanie adresu e-mail jest obowiązkowe do założenia konta.</p>
<p>Użytkownik zobowiązuje się do podania prawdziwych danych, zachowania hasła w poufności oraz niezwłocznego powiadamiania Operatora o nieuprawnionym dostępie do konta.</p>
<p>Operator zastrzega sobie prawo do usunięcia konta, które narusza postanowienia Regulaminu, zawiera obraźliwą treść lub zostało założone w celu działania na szkodę innych użytkowników.</p>

<h2>§ 4. Zasady gry</h2>
<p>Gra polega na fizycznym odnajdywaniu oznaczonych miejsc istotnych logopedycznie i skanowaniu kodów QR umieszczonych przy tabliczkach informacyjnych. Każde odkrycie rejestrowane jest jednorazowo na danym koncie.</p>
<p>Zabronione jest:</p>
<ul>
  <li>udostępnianie kodów QR w sposób umożliwiający ich skanowanie bez fizycznej obecności przy obiekcie,</li>
  <li>manipulowanie danymi gry przy użyciu narzędzi technicznych (cheat, bot),</li>
  <li>niszczenie lub uszkadzanie tabliczek z kodami QR,</li>
  <li>zakłócanie korzystania z aplikacji przez innych użytkowników.</li>
</ul>
<p>Operator zastrzega sobie prawo do unieważnienia odkryć lub usunięcia konta w przypadku stwierdzenia naruszeń powyższych zasad.</p>

<h2>§ 5. Marketing i komunikacja e-mail</h2>
<p>Rejestrując konto i podając adres e-mail, użytkownik wyraża zgodę na otrzymywanie od Operatora informacji handlowych drogą elektroniczną, w tym:</p>
<ul>
  <li>powiadomień o aktualizacjach i nowych funkcjach aplikacji,</li>
  <li>informacji o wydarzeniach SpeechFlow, w tym konferencji SpeechLab,</li>
  <li>ofert partnerów projektu,</li>
  <li>newslettera związanego z projektem „${APP_NAME}".</li>
</ul>
<p>Zgoda na komunikację marketingową jest dobrowolna. Użytkownik może w dowolnym momencie wycofać zgodę, wysyłając wiadomość na adres <a href="mailto:${OPERATOR_EMAIL}">${OPERATOR_EMAIL}</a> lub klikając link rezygnacji w każdej wiadomości e-mail. Wycofanie zgody nie wpływa na ważność konta ani możliwość korzystania z aplikacji.</p>

<h2>§ 6. Własność intelektualna</h2>
<p>Wszelkie treści udostępniane w aplikacji (opisy obiektów, zdjęcia, grafiki, logotypy) stanowią własność Operatora lub jego partnerów i są chronione przepisami prawa autorskiego. Kopiowanie, modyfikowanie lub rozpowszechnianie tych treści bez pisemnej zgody Operatora jest zabronione.</p>

<h2>§ 7. Odpowiedzialność</h2>
<p>Operator dokłada starań, aby aplikacja działała bez zakłóceń, jednak nie gwarantuje jej nieprzerwanej dostępności. Operator nie ponosi odpowiedzialności za:</p>
<ul>
  <li>szkody wynikłe z przerw technicznych lub awarii,</li>
  <li>utratę danych spowodowaną okolicznościami niezależnymi od Operatora,</li>
  <li>działania użytkowników naruszające Regulamin,</li>
  <li>wypadki lub szkody powstałe podczas fizycznej eksploracji terenu.</li>
</ul>
<p>Użytkownicy korzystają z gry terenowej na własną odpowiedzialność. Operator zachęca do zachowania ostrożności podczas poruszania się po terenie Karwi, w szczególności w pobliżu dróg i plaży.</p>

<h2>§ 8. Zmiany Regulaminu</h2>
<p>Operator zastrzega sobie prawo do zmiany Regulaminu. O istotnych zmianach użytkownicy zarejestrowani zostaną poinformowani drogą e-mail lub za pośrednictwem komunikatu w aplikacji. Dalsze korzystanie z aplikacji po wejściu zmian w życie oznacza ich akceptację.</p>

<h2>§ 9. Postanowienia końcowe</h2>
<p>Regulamin podlega prawu polskiemu. W sprawach nieuregulowanych stosuje się przepisy Kodeksu cywilnego oraz ustawy o świadczeniu usług drogą elektroniczną. Wszelkie spory będą rozstrzygane przez właściwy sąd powszechny.</p>
<p>Kontakt z Operatorem: <a href="mailto:${OPERATOR_EMAIL}">${OPERATOR_EMAIL}</a></p>
<p><em>Regulamin obowiązuje od dnia 1 kwietnia 2025 r.</em></p>
`;

const POLITYKA = /* html */`
<h2>1. Administrator danych</h2>
<p>Administratorem Twoich danych osobowych jest <strong>${OPERATOR_NAME}</strong> z siedzibą pod adresem ${OPERATOR_ADDRESS}, e-mail: <a href="mailto:${OPERATOR_EMAIL}">${OPERATOR_EMAIL}</a> (dalej: „Administrator").</p>

<h2>2. Jakie dane zbieramy</h2>
<p>W zależności od sposobu korzystania z aplikacji przetwarzamy następujące dane:</p>
<ul>
  <li><strong>Konto zarejestrowane:</strong> adres e-mail, zaszyfrowane hasło, pseudonim (opcjonalnie), miejscowość (opcjonalnie), awatar (opcjonalnie), data rejestracji.</li>
  <li><strong>Aktywność w grze:</strong> lista odkrytych obiektów, daty i godziny skanowań, liczba odkryć.</li>
  <li><strong>Dane techniczne:</strong> identyfikator sesji gościa (losowy UUID przechowywany lokalnie w przeglądarce), adres IP (w logach serwera), typ przeglądarki.</li>
</ul>
<p>Nie zbieramy danych lokalizacyjnych GPS po stronie serwera — lokalizacja służy wyłącznie do funkcji nawigacyjnych działających lokalnie w przeglądarce użytkownika i nie jest nam przesyłana.</p>

<h2>3. Cele i podstawy prawne przetwarzania</h2>
<ul>
  <li><strong>Świadczenie usługi</strong> (art. 6 ust. 1 lit. b RODO) — rejestracja konta, zapis postępów w grze, prowadzenie rankingu.</li>
  <li><strong>Marketing bezpośredni drogą e-mail</strong> (art. 6 ust. 1 lit. a RODO) — wysyłka newslettera, informacji o wydarzeniach i ofertach partnerów. Zgoda jest wyrażana podczas rejestracji i może być wycofana w dowolnym momencie.</li>
  <li><strong>Uzasadniony interes Administratora</strong> (art. 6 ust. 1 lit. f RODO) — bezpieczeństwo aplikacji, wykrywanie nadużyć, analiza statystyk użytkowania w formie zanonimizowanej.</li>
  <li><strong>Obowiązki prawne</strong> (art. 6 ust. 1 lit. c RODO) — przechowywanie danych wymagane przez przepisy prawa.</li>
</ul>

<h2>4. Wykorzystanie adresu e-mail w celach marketingowych</h2>
<p>Adres e-mail podany podczas rejestracji może być wykorzystywany do przesyłania:</p>
<ul>
  <li>powiadomień o nowych funkcjach i aktualizacjach aplikacji ${APP_NAME},</li>
  <li>informacji o konferencjach i wydarzeniach SpeechFlow,</li>
  <li>ofert i promocji partnerów projektu SpeechFlow,</li>
  <li>komunikatów związanych z grą terenową i nagrodami.</li>
</ul>
<p>Masz prawo w każdej chwili zrezygnować z otrzymywania wiadomości marketingowych — wystarczy kliknąć link rezygnacji w dowolnej wiadomości e-mail lub napisać na <a href="mailto:${OPERATOR_EMAIL}">${OPERATOR_EMAIL}</a>. Rezygnacja nie powoduje usunięcia konta.</p>

<h2>5. Udostępnianie danych</h2>
<p>Twoje dane nie są sprzedawane osobom trzecim. Możemy je udostępnić wyłącznie:</p>
<ul>
  <li>dostawcom usług technicznych (hosting, serwer pocztowy) działającym na nasze zlecenie na podstawie umów powierzenia,</li>
  <li>organom państwowym, jeśli obowiązek taki wynika z przepisów prawa.</li>
</ul>
<p>W rankingu publicznym widoczny jest wyłącznie pseudonim i liczba odkryć — adres e-mail nigdy nie jest publikowany.</p>

<h2>6. Okres przechowywania danych</h2>
<ul>
  <li>Dane konta — do czasu usunięcia konta przez użytkownika lub przez Administratora z powodu naruszenia Regulaminu.</li>
  <li>Dane aktywności w grze — przez czas trwania konta oraz do 12 miesięcy po jego usunięciu (cele statystyczne i bezpieczeństwo).</li>
  <li>Dane marketingowe — do czasu wycofania zgody.</li>
  <li>Logi serwera — do 90 dni.</li>
</ul>

<h2>7. Twoje prawa (RODO)</h2>
<p>Przysługuje Ci prawo do:</p>
<ul>
  <li><strong>dostępu</strong> do swoich danych,</li>
  <li><strong>sprostowania</strong> nieprawidłowych danych,</li>
  <li><strong>usunięcia</strong> danych („prawo do bycia zapomnianym"),</li>
  <li><strong>ograniczenia</strong> przetwarzania,</li>
  <li><strong>przenoszenia</strong> danych,</li>
  <li><strong>sprzeciwu</strong> wobec przetwarzania opartego na uzasadnionym interesie,</li>
  <li><strong>wycofania zgody</strong> na marketing w dowolnym momencie bez wpływu na zgodność z prawem wcześniejszego przetwarzania.</li>
</ul>
<p>Aby skorzystać z powyższych praw, skontaktuj się pod adresem <a href="mailto:${OPERATOR_EMAIL}">${OPERATOR_EMAIL}</a>. Masz również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa.</p>

<h2>8. Pliki cookie i localStorage</h2>
<p>Aplikacja używa <strong>localStorage</strong> przeglądarki do przechowywania identyfikatora sesji gościa, stanu odkryć oraz ustawień wyświetlania. Dane te przechowywane są wyłącznie na Twoim urządzeniu i nie są przesyłane na serwer bez Twojej wiedzy.</p>
<p>Sesja zalogowanego użytkownika przechowywana jest w ciasteczku (cookie) oznaczonym flagą <code>HttpOnly</code>, niedostępnym dla skryptów JavaScript. Nie stosujemy plików cookie analitycznych ani reklamowych stron trzecich.</p>

<h2>9. Bezpieczeństwo</h2>
<p>Hasła użytkowników przechowywane są wyłącznie w formie zaszyfrowanej (bcrypt). Komunikacja z serwerem odbywa się przez szyfrowane połączenie HTTPS. Dostęp do danych osobowych mają wyłącznie upoważnione osoby.</p>

<h2>10. Kontakt</h2>
<p>W sprawach związanych z ochroną danych osobowych prosimy o kontakt: <a href="mailto:${OPERATOR_EMAIL}">${OPERATOR_EMAIL}</a></p>
<p><em>Polityka prywatności obowiązuje od dnia 1 kwietnia 2025 r.</em></p>
`;

async function main() {
  console.log('Injecting content...');

  await prisma.pageContent.upsert({
    where:  { key: 'regulamin' },
    update: { html: REGULAMIN.trim() },
    create: { key: 'regulamin', html: REGULAMIN.trim() },
  });
  console.log('✓ regulamin saved');

  await prisma.pageContent.upsert({
    where:  { key: 'polityka-prywatnosci' },
    update: { html: POLITYKA.trim() },
    create: { key: 'polityka-prywatnosci', html: POLITYKA.trim() },
  });
  console.log('✓ polityka-prywatnosci saved');

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
