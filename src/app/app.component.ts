import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { useGeographic } from 'ol/proj';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';
import { Draw, Modify, Translate } from 'ol/interaction.js';
import { OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';

import GeoJSON from 'ol/format/GeoJSON';
import { FormsModule } from '@angular/forms';
import { Overlay } from 'ol';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  title = 'angular_Map';
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  map!: Map;
  source!: VectorSource;
  draw!: Draw;

  typeSelect: string = 'Point';
  modify: any;

  ngOnInit(): void {
    useGeographic();

    this.initializeMap();
    this.addInteraction();
  }

  initializeMap(): void {
    this.source = new VectorSource({ wrapX: true });

    const raster = new TileLayer({
      source: new OSM(),
    });

    const vector = new VectorLayer({
      source: this.source,
      style: new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.1)',
        }),
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: 'blue',
          }),
        }),
      }),
    });

    this.map = new Map({
      layers: [raster, vector],
      target: this.mapContainer.nativeElement,
      view: new View({
        center: [78.9629, 20.5937],
        zoom: 4,
      }),
    });

    this.loadFeaturesFromLocalStorage();
  }


  addInteraction(): void {
    if (this.typeSelect) {
      this.draw = new Draw({
        source: this.source,
        type: this.typeSelect as any,
      });

      this.map.addInteraction(this.draw);

      this.modify = new Modify({ source: this.source });
      this.map.addInteraction(this.modify);

      this.draw.on('drawend', (event) => {
        this.addDeleteButton(event.feature);
        this.saveFeaturesToLocalStorage();
      });

      this.modify.on('modifyend', () => {
        this.saveFeaturesToLocalStorage();
      });
    }
  }

  onTypeChange(type: string): void {
    this.typeSelect = type;
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    if (this.modify) {
      this.map.removeInteraction(this.modify);
    }
    this.addInteraction();
  }

  loadFeaturesFromLocalStorage(): void {
    const features = localStorage.getItem('features');
    if (features) {
      const geojsonFormat = new GeoJSON();
      const featuresArray = geojsonFormat.readFeatures(features, {
        featureProjection: 'EPSG:3857' // Make sure the projection matches your map's view
      });
      this.source.addFeatures(featuresArray);
    }
  }

  saveFeaturesToLocalStorage(): void {
    const geojsonFormat = new GeoJSON();
    const features = this.source.getFeatures();
    // const geojsonStr = geojsonFormat.writeFeatures(features);
    const geojsonStr = geojsonFormat.writeFeatures(features, {
      featureProjection: 'EPSG:3857'
    });
    localStorage.setItem('features', geojsonStr);
  }

  addDeleteButton(feature: any): void {
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = 'X';
    deleteButton.className = 'delete-button';
    deleteButton.style.backgroundColor = 'red'
    deleteButton.style.height = '25px'

    deleteButton.onclick = () => {
      this.source.removeFeature(feature);
      this.map.removeOverlay(overlay);

      this.saveFeaturesToLocalStorage();
    };

    const overlay = new Overlay({
      element: deleteButton,
      positioning: 'center-center',
    });

    this.map.addOverlay(overlay);

    feature.getGeometry().on('change', () => {
      const coordinates = feature.getGeometry().getFirstCoordinate();
      overlay.setPosition(coordinates);

    });

    // Set initial position of the delete button
    const coordinates = feature.getGeometry().getFirstCoordinate();
    overlay.setPosition(coordinates);
  }
}