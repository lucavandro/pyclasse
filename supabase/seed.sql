-- Dataset completo esclusivamente per lo sviluppo locale.
-- Tutte le identità usano il dominio riservato .test e dati fittizi.
-- Le credenziali sono documentate in docs/LOCAL_DEVELOPMENT_DATA.md.

set search_path = public, extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'teacher@pyclasse.test', extensions.crypt('Teacher2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ada Docente"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'student1@pyclasse.test', extensions.crypt('Student2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Giulia Bianchi"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'student2@pyclasse.test', extensions.crypt('Student2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marco Verdi"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'student3@pyclasse.test', extensions.crypt('Student2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sara Conti"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'student4@pyclasse.test', extensions.crypt('Student2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Luca Romano"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'student5@pyclasse.test', extensions.crypt('Student2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Elena Esposito"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  id,
  id,
  email,
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from auth.users
where email like '%@pyclasse.test'
on conflict do nothing;

update public.app_settings
set
  teacher_email = 'teacher@pyclasse.test',
  school_name = 'Istituto PyClasse'
where singleton = true;

insert into public.classes (id, teacher_id, name, subject, join_code, created_at)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '3A Informatica', 'Informatica', 'PY3A26', now() - interval '45 days'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '4B Informatica', 'Informatica', 'PY4B26', now() - interval '30 days')
on conflict (id) do nothing;

insert into public.class_members (class_id, student_id, joined_at)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', now() - interval '40 days'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', now() - interval '39 days'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', now() - interval '38 days'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', now() - interval '37 days'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', now() - interval '28 days'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', now() - interval '27 days'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', now() - interval '26 days')
on conflict do nothing;

insert into public.exercises (
  id, teacher_id, title, description, starter_code, constraints,
  verification_mode, max_points, is_prerequisite, tags,
  resource_url, resource_label, created_at, updated_at
)
values
  (
    '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
    'Primo saluto',
    E'## Obiettivo\n\nCompleta la funzione `saluta` affinché restituisca la stringa **Ciao, Python!**.\n\n> Non usare `print`: restituisci il valore.',
    E'def saluta():\n    # Scrivi qui la soluzione\n    pass',
    'La funzione non riceve argomenti.', 'tests', 10, true,
    array['funzioni', 'stringhe', 'base'],
    'https://docs.python.org/3/tutorial/controlflow.html#defining-functions', 'Ripasso sulle funzioni',
    now() - interval '35 days', now() - interval '5 days'
  ),
  (
    '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
    'Somma di una lista',
    E'## Obiettivo\n\nImplementa `somma_valori(numeri)` senza usare la funzione incorporata `sum`.\n\nGestisci anche una lista vuota.',
    E'def somma_valori(numeri):\n    totale = 0\n    # Completa il ciclo\n    return totale',
    'Non usare sum().', 'tests', 10, true,
    array['liste', 'cicli', 'funzioni'], null, null,
    now() - interval '30 days', now() - interval '4 days'
  ),
  (
    '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
    'Numeri pari',
    E'## Obiettivo\n\nScrivi `solo_pari(numeri)` che restituisce una nuova lista contenente soltanto i numeri pari, mantenendo l’ordine originale.',
    E'def solo_pari(numeri):\n    return []',
    'Non modificare la lista ricevuta.', 'tests', 10, true,
    array['liste', 'condizioni', 'cicli'], null, null,
    now() - interval '25 days', now() - interval '3 days'
  ),
  (
    '40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
    'Conta le parole',
    E'## Obiettivo\n\nImplementa `conta_parole(testo)` restituendo un dizionario con la frequenza di ogni parola. Ignora maiuscole e minuscole.',
    E'def conta_parole(testo):\n    frequenze = {}\n    return frequenze',
    'Separa le parole con split() e usa lower().', 'tests', 100, false,
    array['dizionari', 'stringhe'], null, null,
    now() - interval '20 days', now() - interval '2 days'
  ),
  (
    '40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
    'Classe Rettangolo',
    E'## Obiettivo\n\nCompleta la classe `Rettangolo` con i metodi `area()` e `perimetro()`.',
    E'class Rettangolo:\n    def __init__(self, base, altezza):\n        self.base = base\n        self.altezza = altezza\n\n    def area(self):\n        pass\n\n    def perimetro(self):\n        pass',
    'Non aggiungere dipendenze esterne.', 'tests', 100, true,
    array['classi', 'oop'],
    'https://docs.python.org/3/tutorial/classes.html', 'Tutorial Python sulle classi',
    now() - interval '15 days', now() - interval '1 day'
  ),
  (
    '40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001',
    'Validazione password',
    E'## Obiettivo\n\nScrivi `password_valida(testo)` che restituisce `True` quando la password contiene almeno 8 caratteri, una maiuscola e una cifra.',
    E'def password_valida(testo):\n    return False',
    'Usa esclusivamente la libreria standard.', 'tests', 10, false,
    array['stringhe', 'condizioni', 'sicurezza'], null, null,
    now() - interval '10 days', now()
  )
on conflict (id) do nothing;

insert into public.tests (id, exercise_id, position, input_data, expected_output, is_hidden, points)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 'saluta()', 'Ciao, Python!', false, 10),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 1, 'somma_valori([1, 2, 3, 4])', '10', false, 5),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 2, 'somma_valori([])', '0', true, 5),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', 1, 'solo_pari([1, 2, 3, 4, 6])', '[2, 4, 6]', false, 10),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000004', 1, 'conta_parole("Ciao ciao Python")', '{''ciao'': 2, ''python'': 1}', false, 100),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000005', 1, 'Rettangolo(4, 3).area()', '12', false, 50),
  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000005', 2, 'Rettangolo(4, 3).perimetro()', '14', true, 50),
  ('50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000006', 1, 'password_valida("Python2026")', 'True', false, 5),
  ('50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000006', 2, 'password_valida("debole")', 'False', true, 5)
on conflict (id) do nothing;

insert into public.class_assignments (
  id, exercise_id, class_id, deadline, published_at, position, grading_scale, created_at
)
values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', now() + interval '3 days', now() - interval '20 days', 1, null, now() - interval '20 days'),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', now() + interval '7 days', now() - interval '15 days', 2, 10, now() - interval '15 days'),
  ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', now() + interval '12 days', now() - interval '10 days', 3, 10, now() - interval '10 days'),
  ('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', now() + interval '18 days', now() - interval '5 days', 4, 100, now() - interval '5 days'),
  ('60000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', now() + interval '9 days', now() - interval '8 days', 1, 100, now() - interval '8 days'),
  ('60000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', now() + interval '15 days', now() - interval '3 days', 2, null, now() - interval '3 days')
on conflict (id) do nothing;

insert into public.submissions (
  id, class_assignment_id, student_id, code, status, score,
  test_results, submitted_at, updated_at
)
values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', E'def saluta():\n    return "Ciao, Python!"', 'passed', null, '[{"passed":true,"input":"saluta()"}]', now() - interval '12 days', now() - interval '12 days'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', E'def somma_valori(numeri):\n    totale = 0\n    for numero in numeri:\n        totale += numero\n    return totale', 'passed', 9, '[{"passed":true},{"passed":true}]', now() - interval '6 days', now() - interval '6 days'),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', E'def solo_pari(numeri):\n    return [n for n in numeri if n % 2 == 0]', 'submitted', null, '[]', now() - interval '1 day', now() - interval '1 day'),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', E'def saluta():\n    return "Ciao"', 'failed', null, '[{"passed":false,"input":"saluta()"}]', now() - interval '2 days', now() - interval '2 days'),
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', E'def saluta():\n    return "Ciao, Python!"', 'passed', null, '[{"passed":true}]', now() - interval '9 days', now() - interval '9 days'),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', E'def somma_valori(numeri):\n    return 0', 'draft', null, '[]', null, now() - interval '2 hours'),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', E'class Rettangolo:\n    pass', 'draft', null, '[]', null, now() - interval '30 minutes')
on conflict (id) do nothing;

insert into public.code_snippets (
  id, owner_id, name, code, created_at, updated_at
)
values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Esempio docente: tabellina', E'numero = 7\nfor fattore in range(1, 11):\n    print(numero, "x", fattore, "=", numero * fattore)', now() - interval '8 days', now() - interval '2 days'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Esempio docente: saluto', E'nome = input("Come ti chiami? ")\nprint(f"Ciao, {nome}!")', now() - interval '5 days', now() - interval '1 day'),
  ('80000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Prova con le liste', E'numeri = [2, 4, 6, 8]\nprint(sum(numeri))', now() - interval '4 days', now() - interval '12 hours'),
  ('80000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Il mio primo ciclo', E'for indice in range(5):\n    print(indice)', now() - interval '3 days', now() - interval '10 hours'),
  ('80000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'Conteggio parole', E'testo = "python rende visibili le idee"\nprint(len(testo.split()))', now() - interval '2 days', now() - interval '8 hours'),
  ('80000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000004', 'Area del rettangolo', E'base = 8\naltezza = 5\nprint(base * altezza)', now() - interval '1 day', now() - interval '6 hours'),
  ('80000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', 'Numeri pari', E'for numero in range(2, 11, 2):\n    print(numero)', now() - interval '12 hours', now() - interval '4 hours')
on conflict (id) do nothing;
