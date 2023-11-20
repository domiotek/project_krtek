import React from 'react';
import styles from './Home.css';
import AppStyles from "../App.css"

export default function Home() {
    return (
        <div className={`${AppStyles.ContentWindow} ${styles.Container}`}>
            <h1>Witaj w prywatnej wersji Alpha</h1>
            <h5>Żeby rozwiać wszelkie wątpliwości, strona będzie po polsku. Tak mi się łatwiej pisze, później przetłumaczę.</h5>

            <h3>Co to jest?</h3>
            <p>
                W dużym szyderczym skrócie, ta aplikacja to kombajn do zarządzania pracownikami. Docelowo będą tu grafiki, materiały do zapoznania się (coś w stylu wyprawki pracownika),
                tu też będzie składało się dyspozycję na przyszły tydzień, czy oddawało lub zamieniało zmianę i to też nie wszystko, będzie tego jeszcze więcej. Żeby pracownicy też coś z
                tego mieli, to będą mieli możliwość zbierania statystyk z danego miesiąca łącznie z ustalaniem celów wydatkowych. Dzięki temu będą mogli na bieżąco sprawdzić sobie, jak wyglądają
                ich zarobki danym miesiącu. Na ten moment gotowy jest właśnie system statystyk plus podstawowy system grafików. Reszta funkcjonalności będzie stopniowo dodawana w formie aktualizacji.
            </p>

            <h3>Jak to działa?</h3>
            <p>
                Dostępne są trzy zakładki:
                <ul>
                    <li>Home</li>
                    <li>Schedule</li>
                    <li>Statistics</li>
                </ul>
            </p>

            <p>
                W zakładce <span>Home</span> znajdować się będzie widok widżetów, swego rodzaju szybki dostęp do najważniejszych funkcjonalności. 
                Póki co jest to co tu widać. Strona jest w budowie.
            </p>

            <p>
                W zakładce <span>Schedule</span> znajduje się tabela z poszczególnymi dniami tygodnia. W wierszach wypisane będą osoby przypisane do danej zmiany wraz z planowanymi godzinami pracy.
                Znak zapytania w planowanej końcowej godzinie oznacza, że dana osoba pracuje do końca. Teraz to już nie bardzo się przyda, lecz jest to przygotowane na zmiany z dwoma kelnerami, gdzie jeden z nich 
                jest np. od lub do 18. <br></br>
                Za pomocą strzałek na górze można przesuwać się między tygodniami. Domyślnie, na początku ładowany jest aktualny tydzień. Możliwe jest przeskoczenie tylko jeden tydzień do przodu.
            </p>

            <p>
                W zakładce <span>Statistics</span> znajdują się wszystkie statystyki z danego miesiąca. Na głównej planszy zgrupowane są statystyki dotyczące całego miesiąca. Są tu pokazane zarobki z podziałem na tipy i godzinówkę, 
                stosunek tipów do zarobków godzin w formie graficznej, ilość przepracowanych godzin i ilość zmian w danym miesiącu. Dodatkowo znajduje się tam system celów ("Milestones"), które pozwalają na śledzenie zaroków
                względem spodziewanych, stałych wydatków miesięcznych. Tu dobrym pomysłem jest wstawienie np. opłaty za mieszkanie, rachunki czy też po prostu określoną kwotę przeznaczoną na życie. Poniżej znajdują się trzy karty: shifts, nerd stats oraz settings. 
                W karcie <span>shifts</span> znajdują się wszystkie zmiany zalogowanego użytkownika w formie listy. 
                Daną zmianę można rozwinąć, aby zobaczyć więcej szczegółów i statystyk oraz edytować zmianę. Karta <span>nerd stats</span> zawiera jeszcze więcej mniej znaczących statystyk przeznaczonych dla fanatyków analityki, takich jak ja.
                Na koniec, karta <span>Settings</span> przechowuje ustawienia związane ze statystykami. Tu zmienimy godzinową stawkę oraz ustawimy dodatkowy, zewnętrzny dochód (jeśli chcemy go wliczać w statystyki oraz do postępu w celach), oraz
                poszczególne kamienie milowe w celu. 
            </p>

            <h3>Jak się tym posługiwać</h3>
            <p>
                Niedługo po ogłoszeniu grafiku, aplikacja zostanie zaktualizowana przeze mnie o nowe dane. Grafik będzie okrojony, tj. będą tam tylko osoby, które mają aktualnie utworzone konta, gdy aplikacja zostanie wydana publicznie, będzie to już każdy, a gdy
                system zgłaszania dyspozycji będzie gotowy, cały proces zostanie zautomatyzowany.
                <br></br>
                Zmiany przydzielone danej osobie pojawią się także w zakładce karcie <span>Statistics/Shifts</span> i najprawdopodobniej będą miały status <span>Planned</span>. Taki status oznacza, że zmiana jest zaplanowana w przyszłości, a to oznacza, że większość akcji z nią
                związanych jest niedostępna. Gdy nastanie dzień planowanej zmiany, jej status zmieni się na <span>Pending</span>. Ten stan oznacza, że zmiana oczekuje na zakończenie i wypełnienie danymi. Zakończyć zmianę najlepiej jest zaraz po wpisaniu się na fizyczne kartki, lecz
                nie jest to wymagane (póki co edycja możliwa jest nawet dla wszystkich zmian z przeszłości, lecz najpewniej tak nie pozostanie). Aby zakończyć zmianę należy znaleźć ją na liście <span>Statistics/Shifts</span>, rozwinąć ją, a następnie kliknąć niebieski przycisk na dole.
                W otwartym oknie należy podać godzinę rozpoczęcia, zakończenia, napiwek oraz odpis. Dodatkowo można także podać notatkę w dwóch formach, prywatnej i dzielonej. Prywatną notatkę widzi tylko osoba, będąca właścicielem zmiany, dzieloną wszystkie osoby będące w danym dniu w pracy 
                (co jest do przemyślenia, może powinna być prywatna oraz publicza, widoczna dla każdego? Wtedy możnaby tu zostawiać informacje np. o tym kto ma klucze).
                Zmiany należy zatwierdzić przyciskiem na dole i to tyle, zmiana została edytowana a statystyki zaktualizowane.
            </p>

            <h3>Pytania i odpowiedzi</h3>
            <p>
                <ol>
                    <li>
                        Nie pokazują mi się żadne statystyki mimo posiadanych i zakończonych zmian, dlaczego?<br></br>
                        Najpewniej nie masz ustawionej stawki godzinowej, przez co większość statystyk nie może zostać policzona. Ustaw ją w zakładce Statistics w karcie Settings.
                    </li>

                    <li>
                        Co jeśli ktoś zastępuje mnie tylko na kilka godzin mojej zmiany?<br></br>
                        W tym wypadku zapisz sobie tylko tyle godzin ile przepracowałaś/łeś, natomiast druga osoba powinna w zakładce Statistics / Shifts kliknąć przycisk Add shift.
                        Pozwoli on na dodatnie zmiany poza grafikiem, lecz tylko do 3 dni wstecz. Taka zmiana będzie także widoczna dla menedżera jako dodana ręcznie. Taką zmianę należy później jeszcze zakończyć.
                    </li>
                </ol>
            </p>

            <h3>Błędy i kontakt</h3>
            <p>
                Aplikacja powinna być stabilna, była już trochę testowana, ale wiele rzeczy mogłem nie wyłapać. Na wszelki wypadek, tym którzy mają plik excela z podobnymi statystykami zalecałbym zapisywanie danych tu i tu.
                Gdyby były jakieś problemy, prosiłbym się śmiało ze mną kontaktować, mogę wszystko naprawić za kulisami, nawet jeśli tu system nie pozwala.
                <br></br>
                Więcej o samym projekcie można poczytać w <a href="https://github.com/domiotek/project_krtek">repozytorium (po angielsku i już lekko nieaktualne)</a>.
            </p>

            <h3>Po co to wszystko?</h3>
            <p>
                Dobre pytanie, trochę dla zabawy, trochę do portfolio.
            </p>
        </div>
    );
}