import React from 'react';
import styles from './BetaIntro.css';
import AppStyles from "../App.css"

export default function BetaIntro() {
    return (
        <div className={`${AppStyles.ContentWindow} ${styles.Container}`}>
            <h1>Witaj w prywatnej wersji Beta</h1>

            <h3>Co to jest?</h3>
            <p>
                W dużym szyderczym skrócie, ta aplikacja to kombajn do zarządzania pracownikami. Docelowo będą tu grafiki, materiały do zapoznania się (coś w stylu wyprawki pracownika, 
                mogą tu też być informacje związane z tym jak robić różne grzane, zimowe napoje - w skrócie wszystko co przynosi jakąś wartość pracownikom),
                tu też będzie składało się dyspozycję na przyszły tydzień, czy oddawało lub zamieniało zmianę i to też nie wszystko, będzie tego jeszcze więcej. Żeby pracownicy też coś z
                tego mieli, to będą mieli możliwość zbierania statystyk z danego miesiąca łącznie z ustalaniem celów wydatkowych. Dzięki temu będą mogli na bieżąco sprawdzić sobie, jak wyglądają
                ich zarobki danym miesiącu. Na ten moment gotowy jest właśnie system statystyk plus podstawowy system grafików. Reszta funkcjonalności będzie stopniowo dodawana w formie aktualizacji.
            </p>

            <h3>Jak to działa?</h3>
            <p>
                Dostępne są trzy zakładki:
                <ul>
                    <li>Strona główna</li>
                    <li>Grafik</li>
                    <li>Moje statystyki</li>
                </ul>
            </p>

            <p>
                Strona główna, otwierana domyślnie, zawiera w sobie zestaw widżetów, które prezentują garść najważnijeszych informacji dostępnych na pierwszy rzut oka. Znajdziesz tam aktualny grafik,
                Twoje nadchodzące zmiany czy zestawienie Twoich zarobków w tym miesiącu.
            </p>

            <p>
                W zakładce <span>Grafik</span> znajduje się tabela z poszczególnymi dniami tygodnia. W wierszach wypisane będą osoby przypisane do danej zmiany wraz z planowanymi godzinami pracy.
                Znak zapytania w planowanej końcowej godzinie oznacza, że dana osoba pracuje do końca. Teraz to już nie bardzo się przyda, lecz jest to przygotowane na zmiany z dwoma kelnerami, gdzie jeden z nich 
                jest np. od lub do 18. <br></br>
                Za pomocą strzałek na górze można przesuwać się między tygodniami. Domyślnie, na początku ładowany jest aktualny tydzień.
            </p>

            <p>
                W zakładce <span>Moje statystyki</span> znajdują się wszystkie statystyki podzielone na poszczególne miesiące. Na głównej planszy znajdziemy podstawowe statystyki dotyczące danego miesiąca. Są tu pokazane zarobki z podziałem na tipy i godzinówkę, 
                stosunek tipów do zarobków godzin w formie graficznej, ilość przepracowanych godzin i ilość zmian w danym miesiącu. Dodatkowo znajduje się tam system celów ("Milestones"), które pozwalają na śledzenie zaroków
                względem spodziewanych, stałych wydatków miesięcznych. Tu dobrym pomysłem jest wstawienie np. opłaty za mieszkanie, rachunki czy też po prostu określoną kwotę przeznaczoną na życie. Poniżej znajdują się trzy karty: Twoje zmiany, Więcej statystyk oraz ustawienia 
                W karcie <span>Twoje zmiany</span> znajdują się wszystkie zmiany zalogowanego użytkownika w formie listy. To miejsce służy do przeglądania, ale także do uzupełniania zmian danymi. 
                Daną zmianę można rozwinąć, aby zobaczyć więcej szczegółów i statystyk czy też edytować ją za pomocą niebieskiego przycisku w prawym dolnym rogu. Karta <span>Więcej statystyk</span> zawiera jeszcze więcej mniej znaczących statystyk przeznaczonych dla fanatyków analityki, takich jak ja.
                Na koniec, karta <span>Ustawienia</span> przechowuje ustawienia związane ze statystykami. Tu zmienimy godzinową stawkę oraz ustawimy dodatkowy, zewnętrzny dochód (jeśli chcemy go wliczać w statystyki oraz do postępu w celach), oraz
                poszczególne etapy w dążeniu do celu. 
            </p>

            <h3>Jak się tym posługiwać</h3>
            <p>
                Niedługo po ogłoszeniu grafiku, aplikacja zostanie zaktualizowana przeze mnie o nowe dane. Grafik będzie okrojony, tj. będą tam tylko osoby, które mają aktualnie utworzone konta, gdy aplikacja zostanie wydana publicznie, będzie to już każdy, a gdy
                system zgłaszania dyspozycji będzie gotowy, cały proces zostanie zautomatyzowany.
                <br></br>
                Przydzielone Tobie zmiany znajdziesz także w zakładce <span>Moje statystyki</span>. Zmiana może przyjmować jeden z 3 stanów - Zaplanowana, oczekująca oraz zakończona. Status "zaplanowana" oznacza, że zmiana ma odbyć się w  przyszłości. Większość akcji dla takiej zmiany będzie niedostępnych.
                Gdy nastanie dzień planowanej zmiany, jej status zmieni się na <span>Oczekująca</span>. Ten stan oznacza, że zmiana oczekuje na zakończenie i wypełnienie danymi. Zakończyć zmianę najlepiej jest zaraz po wpisaniu się na fizyczne kartki, lecz
                nie jest to wymagane (póki co). Aby zakończyć zmianę należy znaleźć ją na liście <span>Twoje zmiany</span> w zakładce <span>Moje statystyki</span>, rozwinąć ją, a następnie kliknąć niebieski przycisk na dole.
                W otwartym oknie należy podać godzinę rozpoczęcia, zakończenia, napiwek oraz odpis. Dodatkowo można także podać notatkę w dwóch formach, prywatnej i dzielonej. Prywatną notatkę widzi tylko osoba, będąca właścicielem zmiany, dzieloną wszystkie osoby będące w danym dniu w pracy 
                (co jest do przemyślenia, może powinna być prywatna oraz publicza, widoczna dla każdego? Wtedy możnaby tu zostawiać informacje np. o tym kto ma klucze).
                Zmiany należy zatwierdzić przyciskiem na dole i to tyle, zmiana została edytowana a statystyki zaktualizowane.
            </p>

            <h3>Pytania i odpowiedzi</h3>
            <p>
                <ol>
                    <li>
                        Nie pokazują mi się żadne statystyki mimo posiadanych i zakończonych zmian, dlaczego?<br></br>
                        Najpewniej nie masz ustawionej stawki godzinowej, przez co większość statystyk nie może zostać policzona. Ustaw ją w zakładce Moje statystyki w karcie Ustawienia.
                    </li>

                    <li>
                        Co jeśli ktoś zastępuje mnie tylko na kilka godzin mojej zmiany?<br></br>
                        W tym wypadku osoba, która była oryginalnie wpisana w ten dzień według grafiku powinna uzupełnić swoją zmianę tak jak robi to zwykle, tyle że ze zredukowaną ilością godzin. Osoba zastępująca natomiast powinna w zakładce Moje statysyki / Twoje zmiany kliknąć przycisk Dodaj zmianę.
                        Pozwoli on na dodatnie zmiany poza grafikiem, lecz tylko do 3 dni wstecz. Taka zmiana będzie także widoczna dla menedżera jako dodana ręcznie. Tak dodana zmiana przyjmie stan "oczekująca", więc później należy ją jeszcze zakończyć.
                    </li>
                </ol>
            </p>

            <h3>Błędy i kontakt</h3>
            <p>
                Aplikacja jest stabilna, co nie znaczy, że nie mogą pojawić się gdzieniegdzie jeszcze jakieś błędy.
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