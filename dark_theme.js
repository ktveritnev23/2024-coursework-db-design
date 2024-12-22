var light_theme  = 'light';
function togglecolors() {
    
    if (light_theme == "light"){
        document.querySelector("html").setAttribute('data-theme', 'dark');
        light_theme  = 'dark';
    } else {
        document.querySelector("html").setAttribute('data-theme', 'light');
        light_theme  = 'light';
    }
}