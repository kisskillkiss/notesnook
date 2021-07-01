import React, { useEffect } from 'react';
import { BackHandler, InteractionManager, Keyboard } from 'react-native';
import { simpleDialogEvent } from '../../components/DialogManager/recievers';
import { TEMPLATE_EXIT_FULLSCREEN } from '../../components/DialogManager/Templates';
import { useSettingStore } from '../../provider/stores';
import { DDS } from '../../services/DeviceDetection';
import {
  eSendEvent,
  eSubscribeEvent,
  eUnSubscribeEvent,
  ToastEvent
} from '../../services/EventManager';
import { editing } from '../../utils';
import {
  eClearEditor,
  eCloseFullscreenEditor,
  eOnLoadNote
} from '../../utils/Events';
import { tabBarRef } from '../../utils/Refs';
import {
  checkNote,
  clearEditor,
  clearTimer,

  EditorWebView,

  isNotedEdited,
  loadNote
} from './Functions';
import tiny from './tiny/tiny';
import { toolbarRef } from './tiny/toolbar/constants';

let handleBack;

const EditorRoot = () => {
  const fullscreen = useSettingStore(state => state.fullscreen);

  useEffect(() => {
    eSubscribeEvent(eOnLoadNote, load);
    eSubscribeEvent(eClearEditor, onCallClear);
    return () => {
      eUnSubscribeEvent(eClearEditor, onCallClear);
      eUnSubscribeEvent(eOnLoadNote, load);
    };
  }, []);

  useEffect(() => {
    if (fullscreen && DDS.isTab) {
      handleBack = BackHandler.addEventListener('hardwareBackPress', () => {
        simpleDialogEvent(TEMPLATE_EXIT_FULLSCREEN());
        editing.isFullscreen = false;
        return true;
      });
    }

    return () => {
      clearTimer();
      if (handleBack) {
        handleBack.remove();
        handleBack = null;
      }
    };
  }, [fullscreen]);

  const load = async (item) => {
    await loadNote(item);
    InteractionManager.runAfterInteractions(() => {
      Keyboard.addListener('keyboardDidShow', tiny.onKeyboardShow);
      if (!DDS.isTab) {
        handleBack = BackHandler.addEventListener(
          'hardwareBackPress',
          _onHardwareBackPress,
        );
      }
    });
  };

  const onCallClear = async (value) => {
    if (value === 'removeHandler') {
      if (handleBack) {
        handleBack.remove();
        handleBack = null;
      }
      return;
    }
    if (value === 'addHandler') {
      if (handleBack) {
        handleBack.remove();
        handleBack = null;
      }

      handleBack = BackHandler.addEventListener(
        'hardwareBackPress',
        _onHardwareBackPress,
      );
      return;
    }
    if (editing.currentlyEditing) {
      await _onBackPress();
    }
  };

  const _onHardwareBackPress = async () => {
    if (editing.currentlyEditing) {
      await _onBackPress();
      return true;
    }
  };


  const _onBackPress = async () => {
    if (DDS.isTab && fullscreen) {
      eSendEvent(eCloseFullscreenEditor);
      return;
    }
    tiny.call(EditorWebView,tiny.blur);
    setTimeout(async () => {
      eSendEvent('showTooltip');
      toolbarRef.current?.scrollTo({
        x: 0,
        y: 0,
        animated: false,
      });
      editing.isFocused = false;
      editing.currentlyEditing = false;

      if (DDS.isTab) {
        if (fullscreen) {
          eSendEvent(eCloseFullscreenEditor);
        }
      } else {
        if (!DDS.isTab) {
          tabBarRef.current?.goToPage(0);
        }
        eSendEvent('historyEvent', {
          undo: 0,
          redo: 0,
        });

        if (checkNote() && isNotedEdited()) {
          ToastEvent.show({
            heading: 'Note Saved',
            type: 'success',
            duration:1500
          });
        }
        await clearEditor();
        Keyboard.removeListener('keyboardDidShow', tiny.onKeyboardShow);
        if (handleBack) {
          handleBack.remove();
          handleBack = null;
        }
      }
    }, 50);
  };

  return <></>;
};

export default EditorRoot;
