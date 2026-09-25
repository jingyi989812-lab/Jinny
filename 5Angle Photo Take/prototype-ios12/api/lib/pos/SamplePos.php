<?php
/**
 * A pretend POS with made-up customers, for testing the app end to end before the real POS
 * is connected. Enable with 'pos' => array('driver' => 'Sample') — never in production.
 *
 * It is also the template for the real driver: copy it to lib/pos/<Name>Pos.php, rename the
 * class to <Name>Pos, and replace each method body with a call to the POS API
 * (pf_http_json() in lib/Pos.php does the HTTP part), mapping each record to the array
 * shape described there.
 */
class SamplePos implements PosSource
{
    private $customers;

    public function __construct(array $cfg)
    {
        // e.g. $this->baseUrl = $cfg['base_url']; $this->token = $cfg['token'];
        $this->customers = array(
            array('id' => 'BM 2756', 'name' => 'Vera Chuah', 'phone' => '012-555 4821', 'time' => '10:30 AM', 'lastVisit' => '2026-08-12'),
            array('id' => 'BM 2811', 'name' => 'Alan Tan',     'phone' => '016-555 7130', 'time' => '11:15 AM', 'lastVisit' => '2026-07-28'),
            array('id' => 'BM 2402', 'name' => 'Jolene Pang',    'phone' => '017-555 5514', 'time' => '2:00 PM',  'lastVisit' => '2026-08-03'),
            array('id' => 'BM 1180', 'name' => 'Serene Kwok',  'phone' => '019-555 4409', 'time' => '',         'lastVisit' => '2026-06-11'),
        );
    }

    public function today($date)
    {
        // Real driver: GET /appointments?date=$date
        return array_values(array_filter($this->customers, function ($c) { return $c['time'] !== ''; }));
    }

    public function search($query, $limit)
    {
        // Real driver: GET /customers?q=$query&limit=$limit
        $q = strtolower(preg_replace('/[\s-]/', '', $query));
        $hits = array();
        foreach ($this->customers as $c) {
            $hay = strtolower(preg_replace('/[\s-]/', '', $c['name'] . '|' . $c['id'] . '|' . $c['phone']));
            if ($q !== '' && strpos($hay, $q) !== false) {
                $hits[] = $c;
            }
        }
        return array_slice($hits, 0, $limit);
    }

    public function find($id)
    {
        // Real driver: GET /customers/{id}
        foreach ($this->customers as $c) {
            if (pf_normalize_id($c['id']) === $id) {
                return $c;
            }
        }
        return null;
    }
}
