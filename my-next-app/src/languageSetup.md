## Import i18next to a new script

First, ensure this line on the top of script

```bash
'use client';
```

and then import i18n

```bash
import { useTranslation } from 'react-i18next';
```

## Using i18n to translate texts

Add this line

```bash
const { t } = useTranslation();
```

and then use

```bash
{t('yourKey)}
```

yourKey is related to the key in translation.json

## Update translation.json

Navigate to the `/locales` directory, open each folder, and update every `translation.json` by adding yourKey along with the corresponding content.
