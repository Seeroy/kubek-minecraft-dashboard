class KubekCircleProgress {
    // Конструктор
    constructor(el, value, radius, centerColor, bgColor, activeColor, text = "") {
        this.value = value;
        this.element = el;
        this.centerColor = centerColor;
        this.bgColor = bgColor;
        this.activeColor = activeColor;
        this.radius = radius;
        if(text !== ""){
            this.text = text;
        } else {
            this.text = value + "%";
        }
    }

    // Создать элемент прогресса
    create() {
        $(this.element).prop("role", "progressbar");
        $(this.element).addClass("circle-progress");
        $(this.element).css("width", this.radius + "px");
        $(this.element).css("height", this.radius + "px");
        $(this.element).html("<span class='text'>" + this.text + "</span>");
        this.refreshColors();
    }

    // Получить прогресс
    getValue() {
        return this.value;
    }

    // Установить прогресс
    setValue(value, updateText = true) {
        this.value = value;
        this.refreshColors();
        if(updateText){
            this.text = value + "%";
            $(this.element).html("<span class='text'>" + this.text + "</span>");
        }
    }

    refreshColors(){
        $(this.element).css("background", KubekCircleProgress.generateGradient(this.centerColor, this.bgColor, this.activeColor, this.value));
    }

    // Установить текст внутрь
    setText(text){
        this.text = text;
        $(this.element).html("<span class='text'>" + this.text + "</span>");
    }

    // Получить установленный текст
    getText(){
        return this.text;
    }

    // Установить главный цвет
    setActiveColor(color){
        this.activeColor = color;
        this.refreshColors();
    }

    // Установить цвет центральной части
    setCenterColor(color){
        this.centerColor = color;
        this.refreshColors();
    }

    // Установить цвет неактивной части прогресса
    setBgColor(color){
        this.bgColor = color;
        this.refreshColors();
    }

    // Сгенерировать градиент для круглого бара
    static generateGradient(centerColor, bgColor, activeColor, value) {
        return 'radial-gradient(closest-side, ' + centerColor + ' 79%, transparent 80% 100%), conic-gradient(' + activeColor + ' ' + value + '%, ' + bgColor + ' 0)'
    }
}