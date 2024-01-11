const NOTIFY_MODAL_CODE =
    '<div class="notify-modal modal-bg" id="$5"> <div class="notify-window"> <div class="notify-icon">$4</div> <div class="notify-caption">$1</div> <div class="notify-description">$2</div> <button id="cmbtn-$5" class="primary-btn">$3</button> $6 </div> </div>';

class KubekNotifyModal {
    static create(caption, text, buttonText, icon, cb = () => {
    }, additionalElements = "") {
        $(".blurScreen").show();
        let iconEl = "<span class='material-symbols-rounded'>" + icon + "</span>";
        let randomID = "notify-" + Math.floor(Math.random() * (1000 - 10 + 1)) + 10;
        $("body").append(
            NOTIFY_MODAL_CODE.replaceAll(/\$1/gim, caption)
                .replaceAll(/\$2/gim, text)
                .replaceAll(/\$3/gim, buttonText)
                .replaceAll(/\$4/gim, iconEl)
                .replaceAll(/\$5/gim, randomID)
                .replaceAll(/\$6/gim, additionalElements)
        );
        $("#cmbtn-" + randomID)
            .on("click", function () {
                animateCSSJ("#" + randomID, "fadeOut", true).then(() => {
                    $(this).parent().parent().remove();
                });
                $(".blurScreen").hide();
                cb();
            });
    }

    // Удалить все модальные окна
    static destroyAllModals() {
        $(".notify-modal").remove();
        $(".blurScreen").hide();
    }

    // Создать modal с запросом ввода от пользователя
    static askForInput(caption, icon, cb = () => {}, description = "", placeholder = "{{commons.input}}", value = "", iType = "text"){
        let inputRandID = KubekUtils.uuidv4();
        let desc = "<p>" + description + "</p><input style='width: 300px;' id='" + inputRandID + "' type='" + iType + "' placeholder='" + placeholder + "' value='" + value + "'></input>";
        this.create(caption, desc, "{{commons.save}}", icon, () => {
            cb($("#" + inputRandID).val());
        }, KubekPredefined.MODAL_CANCEL_BTN);
    }
}