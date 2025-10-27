import React from 'react';
import { SearchBox } from '@mapbox/search-js-react';
import './SearchBoxAdd.css';

function SearchBoxAdd({ onSelect }) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  return (
    <div className="search-box-container">
      <SearchBox
        accessToken={MAPBOX_TOKEN}
        inputProps={{
          className: "mapbox-searchbox-input",
          placeholder: "Search for address or location..."
        }}
        options={{ language: 'en', country: 'IN' }}
        onRetrieve={(res) => {
          if (res?.features?.[0]?.geometry?.coordinates) {
            const [lng, lat] = res.features[0].geometry.coordinates;
                onSelect({
                lng,
                lat,
                address: res.features[0].place_name,
                startTime: "",
                endTime: ""
                });
          }
        }}
      />
    </div>
  );
}
export default SearchBoxAdd;
