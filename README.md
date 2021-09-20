# device-info-crawler

API to search additional information (only resolution for now) about devices, based on device model.

### Request example

```bash
curl --location --request GET 'https://device-info-crawler.herokuapp.com/api?device_model=iphone9,1' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json'
```

### Response example

```json
[
  {
    "deviceModel": "iphone9,1",
    "device": "Apple iPhone 7",
    "resolution": "750 x 1334 pixels, 16:9 ratio (~326 ppi density)"
  }
]
```
