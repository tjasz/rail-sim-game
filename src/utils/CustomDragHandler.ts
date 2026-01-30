import L from 'leaflet';

/**
 * Custom drag handler that checks for ctrl/meta key modifiers.
 * When ctrl or meta key is pressed, it allows normal dragging behavior.
 * When no modifier key is pressed, it implements custom behavior (currently just logs).
 */
export class CustomDragHandler extends L.Handler {
  private _map: L.Map;
  private _dragging: boolean = false;
  private _container: HTMLElement;

  constructor(map: L.Map) {
    super(map);
    this._map = map;
    this._container = this._map.getContainer();
  }

  addHooks(): void {
    // Add mouse event listeners
    this._container.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    
    // Add touch event listeners
    this._container.addEventListener('touchstart', this._onTouchStart);
    document.addEventListener('touchmove', this._onTouchMove);
    document.addEventListener('touchend', this._onTouchEnd);
    document.addEventListener('touchcancel', this._onTouchCancel);
    
    // Add keyboard event listeners
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);

    // Disable the default dragging behavior
    if (this._map.dragging) {
      this._map.dragging.disable();
    }
  }

  removeHooks(): void {
    // Remove mouse event listeners
    this._container.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    
    // Remove touch event listeners
    this._container.removeEventListener('touchstart', this._onTouchStart);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    document.removeEventListener('touchcancel', this._onTouchCancel);
    
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);

    // Re-enable the default dragging behavior
    if (this._map.dragging) {
      this._map.dragging.enable();
    }
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey) {
      // If we're currently dragging without modifier, switch to normal drag mode
      if (this._dragging) {
        console.log('CustomDragHandler: Switching to normal drag mode');
        this._dragging = false;
        if (this._map.dragging) {
          this._map.dragging.enable();
        }
      }
    }
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (!e.ctrlKey && !e.metaKey) {
      // If we were in normal drag mode, switch back
      if (this._map.dragging && this._map.dragging.enabled()) {
        this._map.dragging.disable();
      }
    }
  };

  private _onMouseDown = (e: MouseEvent): void => {
    // Check if ctrl or meta key is pressed
    if (e.ctrlKey || e.metaKey) {
      // Allow normal dragging behavior
      console.log('CustomDragHandler: Ctrl/Meta key detected, enabling normal drag');
      if (this._map.dragging) {
        this._map.dragging.enable();
      }
      return;
    }

    // Custom behavior when no modifier key is pressed
    console.log('CustomDragHandler: Custom drag mode - no modifier key detected');
    this._dragging = true;
    
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();
  };

  private _onMouseMove = (e: MouseEvent): void => {
    if (!this._dragging) {
      return;
    }

    // Check if ctrl or meta key is now pressed
    if (e.ctrlKey || e.metaKey) {
      // Switch to normal dragging
      this._dragging = false;
      if (this._map.dragging) {
        this._map.dragging.enable();
      }
      return;
    }

    // Custom drag behavior
    console.log('CustomDragHandler: Custom drag move detected');
    
    // TODO: Implement custom drag behavior here
    // For now, just log the event
  };

  private _onMouseUp = (e: MouseEvent): void => {
    if (this._dragging) {
      console.log('CustomDragHandler: Custom drag ended');
      this._dragging = false;
    }

    // If normal dragging was temporarily enabled, disable it again
    if (this._map.dragging && this._map.dragging.enabled() && !e.ctrlKey && !e.metaKey) {
      this._map.dragging.disable();
    }
  };

  private _onTouchStart = (e: TouchEvent): void => {
    // For touch devices, check if this is a multi-touch gesture
    if (e.touches.length === 1) {
      // Single touch - custom behavior
      console.log('CustomDragHandler: Custom touch drag mode - single finger detected');
      this._dragging = true;
      
      // Prevent default behavior
      e.preventDefault();
      e.stopPropagation();
    } else if (e.touches.length >= 2) {
      // Multi-touch (pinch/zoom) - allow normal behavior
      console.log('CustomDragHandler: Multi-touch detected, enabling normal drag');
      if (this._map.dragging) {
        this._map.dragging.enable();
      }
    }
  };

  private _onTouchMove = (e: TouchEvent): void => {
    if (!this._dragging) {
      return;
    }

    // Check if it's now a multi-touch gesture
    if (e.touches.length >= 2) {
      // Switch to normal dragging for multi-touch
      this._dragging = false;
      if (this._map.dragging) {
        this._map.dragging.enable();
      }
      return;
    }

    // Custom touch drag behavior
    console.log('CustomDragHandler: Custom touch drag move detected');
    
    // TODO: Implement custom touch drag behavior here
    // For now, just log the event
  };

  private _onTouchEnd = (e: TouchEvent): void => {
    if (this._dragging) {
      console.log('CustomDragHandler: Custom touch drag ended');
      this._dragging = false;
    }

    // If normal dragging was temporarily enabled, disable it again
    if (this._map.dragging && this._map.dragging.enabled() && e.touches.length === 0) {
      this._map.dragging.disable();
    }
  };

  private _onTouchCancel = (): void => {
    if (this._dragging) {
      console.log('CustomDragHandler: Custom touch drag cancelled');
      this._dragging = false;
    }

    // If normal dragging was temporarily enabled, disable it again
    if (this._map.dragging && this._map.dragging.enabled()) {
      this._map.dragging.disable();
    }
  };
}
