// js/features/media-picker/mediaPicker.js - Instagram Media Picker & Multi-Select Controller
import {
  initInstagramMediaPicker,
  openInstagramMediaPicker,
  closeInstagramMediaPicker
} from "../../../src/components/media/MediaPickerModal.js";

export function initMediaPicker() {
  initInstagramMediaPicker();
}

export function openPicker() {
  openInstagramMediaPicker();
}

export function closePicker() {
  closeInstagramMediaPicker();
}

export {
  initInstagramMediaPicker,
  openInstagramMediaPicker,
  closeInstagramMediaPicker
};
