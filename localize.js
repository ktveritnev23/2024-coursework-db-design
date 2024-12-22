document.title='Редактор моделей баз данных';

entity_name.placeholder=entity_name.getAttribute('data-ru');
function changelang(){
    var currentlanguage = getComputedStyle(document.body).getPropertyValue("--language")
    var entity_name = document.getElementById('entity_name');
    var ident_input = document.getElementById('ident_input');
    if (currentlanguage == 'data-ru'){
    document.title='ER Model Editor';
    document.documentElement.style.setProperty('--language', 'data-en')
    entity_name.placeholder=entity_name.getAttribute('data-en');
    ident_input.placeholder=ident_input.getAttribute('data-en');
} else {
    document.title='Редактор моделей баз данных';
    document.documentElement.style.setProperty('--language', 'data-ru')
    entity_name.placeholder=entity_name.getAttribute('data-ru');
    ident_input.placeholder=ident_input.getAttribute('data-ru');
}
}