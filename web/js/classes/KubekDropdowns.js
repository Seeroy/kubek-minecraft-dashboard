const DROPDOWN_BASE =
    "<div class='dropdown layout-accent-box' id='dropdown-$1' style='left: $2px; top: $3px; z-index: $4;'>$5</div>";
const DROPDOWN_ITEM_BASE =
    "<div class='dropdown-item' data-data='$3'>$2$1</div>";
const DROPDOWN_ITEM_ICON_BASE =
    "<span class='material-symbols-rounded'>$1</span>";

class KubekDropdowns {
    // Функция для добавления нового дропдауна
    static addDropdown(data, posX, posY, zIndex, callback = () => {
    }) {
        this.removeAllDropdowns();
        let poolElement = $("body");
        let newID = this.generateDropdownID();
        let dropdownItems = "";
        data.forEach((item) => {
            if (typeof item.icon !== "undefined") {
                dropdownItems =
                    dropdownItems +
                    DROPDOWN_ITEM_BASE.replaceAll(/\$1/gim, item.text)
                        .replaceAll(
                            /\$2/gim,
                            DROPDOWN_ITEM_ICON_BASE.replace(/\$1/gim, item.icon)
                        )
                        .replaceAll(/\$3/gim, item.data)
            } else {
                dropdownItems =
                    dropdownItems +
                    DROPDOWN_ITEM_BASE.replaceAll(/\$1/gim, item.text)
                        .replaceAll(/\$2/gim, "")
                        .replaceAll(/\$3/gim, item.data);
            }
        });

        let dropdownCode = DROPDOWN_BASE.replaceAll("$1", newID)
            .replaceAll("$2", posX)
            .replaceAll("$3", posY)
            .replaceAll("$4", zIndex)
            .replaceAll("$5", dropdownItems);

        poolElement.append(dropdownCode);
        $("#dropdown-" + newID + " .dropdown-item").on("click", function () {
            callback($(this).data("data"));
            KubekDropdowns.removeAllDropdowns();
        });
    }

    // Получить ID для нового дропдауна
    static generateDropdownID() {
        return $("body .dropdown").length;
    }

    // Удалить все дропдауны
    static removeAllDropdowns() {
        $("body .dropdown").remove();
    }
}
