<?php

return [
  'office_ips' => array_values(array_filter(array_map('trim', explode(',', env('OFFICE_IPS', ''))))),
];
