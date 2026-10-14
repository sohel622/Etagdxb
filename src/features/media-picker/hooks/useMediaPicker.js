// Media Picker State & Selection Hook (Up to 5 items)

export class MediaPickerState {
  constructor(initialMedia = []) {
    this.allMedia = [...initialMedia];
    this.selectedItems = initialMedia[0] ? [initialMedia[0]] : [];
    this.activePreviewItem = initialMedia[0] || null;
    this.isMultiSelectMode = false;
    this.activeAlbum = "Recents";
    this.activeCategory = "Recents";
    this.isAspect45 = true;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  toggleMultiSelect() {
    this.isMultiSelectMode = !this.isMultiSelectMode;
    if (!this.isMultiSelectMode && this.selectedItems.length > 1) {
      this.selectedItems = [this.selectedItems[0]];
    }
    this.notify();
  }

  selectItem(item) {
    if (!this.isMultiSelectMode) {
      this.selectedItems = [item];
      this.activePreviewItem = item;
    } else {
      const idx = this.selectedItems.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        if (this.selectedItems.length > 1) {
          this.selectedItems.splice(idx, 1);
          this.activePreviewItem = this.selectedItems[this.selectedItems.length - 1];
        }
      } else {
        if (this.selectedItems.length < 5) {
          this.selectedItems.push(item);
          this.activePreviewItem = item;
        }
      }
    }
    this.notify();
  }

  setAlbum(album) {
    this.activeAlbum = album;
    this.notify();
  }

  setCategory(category) {
    this.activeCategory = category;
    this.notify();
  }

  toggleAspectRatio() {
    this.isAspect45 = !this.isAspect45;
    this.notify();
  }
}
