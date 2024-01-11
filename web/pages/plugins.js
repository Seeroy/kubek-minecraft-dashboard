$(function() {
  KubekUI.setTitle("Kubek | {{sections.plugins}}");

  KubekPluginsUI.refreshAllLists();
});

KubekPluginsUI = class {
  // Обновить список плагинов
  static refreshPluginsList() {
    let listElem = $("#plugins-list");
    KubekPlugins.getPluginsList((plugins) => {
      if(listElem.length === 1){
        listElem.html("");
      }
      plugins.forEach((plugin) => {
        KubekPluginsUI.addPluginItemToList(listElem, plugin, "plugin");
      })
    });
  }

// Обновить список модов
  static refreshModsList() {
    let listElem = $("#mods-list");
    KubekPlugins.getModsList((mods) => {
      if(listElem.length === 1){
        listElem.html("");
      }
      mods.forEach((mod) => {
        KubekPluginsUI.addPluginItemToList(listElem, mod, "mod");
      })
    });
  }

// Добавить мод/плагин в список
  static addPluginItemToList(listElem, item, itemType){
    let nameSplit = item.split('.');
    let displayName = item.replaceAll(".jar", "").replaceAll(".dis", "");
    let switchedOn = " checked";
    let onclick1 = 'KubekPluginsUI.togglePluginOrMod("' + item + '", "' + itemType + '")';
    let onclick2 = 'KubekFileManager.deleteFile("/' + itemType + 's/' + item + '", KubekPluginsUI.refreshAllLists)';
    if(nameSplit[nameSplit.length - 1] === "dis"){
      switchedOn = "";
    }
    let itemHTML = "<div class='item'><label class='switch'><input onchange='" + onclick1 + "' type='checkbox'" + switchedOn + "><span class='slider round'></span></label><span class='filename'>" + displayName + "</span><button class='dark-btn icon-only' onclick='" + onclick2 + "'><span class='material-symbols-rounded'>delete</span></button></div>";
    listElem.append(itemHTML);
  }

// Сменить состояние мода/файла (вкл./выкл.)
  static togglePluginOrMod(item, type){
    let nameSplit = item.split('.');
    let newName;
    if(nameSplit[nameSplit.length - 1] === "dis"){
      newName = item.replace(".dis", "");
    } else {
      newName = item + ".dis";
    }
    KubekFileManager.renameFile("/" + type + "s/" + item, newName, () => {
      setTimeout(() => {
        KubekPluginsUI.refreshAllLists();
      }, 800);
    });
  }

// Обновить все списки
  static refreshAllLists() {
    KubekPluginsUI.refreshPluginsList();
    KubekPluginsUI.refreshModsList();
  }

// Загрузить плагин/мод на сервер
  static uploadItem(itemType){
    let uploadURL = "/" + itemType + "s/" + selectedServer;
    let inputElement = $("#server-" + itemType + "-input");
    inputElement.trigger("click");
    inputElement.off("change");
    inputElement.on("change", () => {
      let formData = new FormData($("#server-" + itemType + "-form")[0]);
      KubekRequests.post(uploadURL, () => {
        KubekPluginsUI.refreshAllLists();
      }, formData);
    });
  }
}