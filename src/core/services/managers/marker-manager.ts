import {Injectable, NgZone} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';

import {SebmGoogleMapMarker} from './../../directives/google-map-marker';

import {GoogleMapsAPIWrapper} from './../google-maps-api-wrapper';
import {Marker, LatLngLiteral} from './../google-maps-types';

@Injectable()
export class MarkerManager {
  private _markers: Map<SebmGoogleMapMarker, Promise<Marker>> =
      new Map<SebmGoogleMapMarker, Promise<Marker>>();

  constructor(private _mapsWrapper: GoogleMapsAPIWrapper, private _zone: NgZone) {
    this._handleMapZoomChange();
  }
  private _handleMapZoomChange() {
    this._mapsWrapper.subscribeToMapEvent<void>('zoom_changed').subscribe(() => {
      this._checkMarkerDistance();
    });
  }

  private _checkMarkerDistance() {
    let coords = new Array<LatLngLiteral>();
    let keys = new Array<SebmGoogleMapMarker>();
    this._markers.forEach((value: Promise<Marker>, key: SebmGoogleMapMarker) => {
      coords.push({lat: key.latitude, lng: key.longitude});
      keys.push(key);
    });
    this._mapsWrapper.fromLatLngToPoint(coords).then((points: Array<any>) => {
      let n = 0;
      for (let p of points) {
        p.key = keys[n];
        n = n + 1;
      }
      let toHide = new Map<SebmGoogleMapMarker, boolean>();
      points.sort((a, b) => {return a.x - b.x; });
      if (points.length > 1) {
        for (let i = 1 ; i < points.length ; i++) {
          if (Math.abs(points[i].x - points[i - 1].x) < 100) {
            toHide.set(points[i].key, true);
            toHide.set(points[i - 1].key, true);
          }
        }
      }
      this._markers.forEach((value: Promise<Marker>, key: SebmGoogleMapMarker) => {
        if (toHide.get(key)) {
          value.then((m: Marker) => {m.setLabel(''); });
        } else {
          value.then((m: Marker) => {m.setLabel(key.label); });
        }
      });

    });
  }

  deleteMarker(marker: SebmGoogleMapMarker): Promise<void> {
    const m = this._markers.get(marker);
    if (m == null) {
      // marker already deleted
      return Promise.resolve();
    }
    return m.then((m: Marker) => {
      return this._zone.run(() => {
        m.setMap(null);
        this._markers.delete(marker);
      });
    });
  }

  updateMarkerPosition(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then(
        (m: Marker) => m.setPosition({lat: marker.latitude, lng: marker.longitude}));
  }

  updateTitle(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setTitle(marker.title));
  }

  updateLabel(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => { m.setLabel(marker.label); });
  }

  updateDraggable(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setDraggable(marker.draggable));
  }

  updateIcon(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setIcon(marker.iconUrl));
  }

  updateOpacity(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setOpacity(marker.opacity));
  }

  updateVisible(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setVisible(marker.visible));
  }

  updateZIndex(marker: SebmGoogleMapMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setZIndex(marker.zIndex));
  }

  addMarker(marker: SebmGoogleMapMarker) {
    const markerPromise = this._mapsWrapper.createMarker({
      position: {lat: marker.latitude, lng: marker.longitude},
      label: marker.label,
      draggable: marker.draggable,
      icon: marker.iconUrl,
      opacity: marker.opacity,
      visible: marker.visible,
      zIndex: marker.zIndex,
      title: marker.title
    });
    this._markers.set(marker, markerPromise);
  }

  getNativeMarker(marker: SebmGoogleMapMarker): Promise<Marker> {
    return this._markers.get(marker);
  }

  createEventObservable<T>(eventName: string, marker: SebmGoogleMapMarker): Observable<T> {
    return Observable.create((observer: Observer<T>) => {
      this._markers.get(marker).then((m: Marker) => {
        m.addListener(eventName, (e: T) => this._zone.run(() => observer.next(e)));
      });
    });
  }
}
