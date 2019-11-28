#!/usr/bin/env python

from argparse import ArgumentParser
from os import path
import csv


def parse_args():
    """Build and parse cli arguments
    :returns: arguments dict
    """

    parser = ArgumentParser(description="Convert csv uri files to webserver redirect rules")
    parser.add_argument('csv', help="CSV file to parse")
    parser.add_argument('-t', '--target', required=True, choices=['apache', 'nginx'],
                        help="target web server")
#    parser.add_argument('-a', '--add', action='store_true',
#                        help="add generated redirect rules to webserver config")
    parser.add_argument('-d', '--dest',
                        help="destination directory")
#    parser.add_argument('-y', '--yes', action='store_true',
#                        help="default to yes on confirmation prompt")
    return parser.parse_args()

def construct_file_path(directory, file_name):
    """Given a directory and a file_name, construct a full file_path."""
    return path.join(directory, file_name)

def construct_webserver_rules(entries, webserver):
    """Construct webserver redirect rules based on webserver."""
    lst = []
    if webserver == 'nginx':
        prefix = ""
        for row in entries:
            lst.append(f"rewrite /{row['docType']}/{row['pid']}$ {row['url']} redirect")
    else:
        prefix = "Options +FollowSymLinks\nRewriteEngine on\n\n"
        for row in entries:
            lst.append(f"RewriteRule ^{row['docType']}/{row['pid']}$ {row['url']} [R=302,NC,NE,L]")
    return prefix + '\n'.join(lst) + '\n'

def is_valid_row(row):
    """check if a row is valid for transformation"""
    if not row["PID"]:
        return False
    if not row["document type"]:
        return False
    if not row["URL"]:
        return False
    return True

def parse_csv(filename):
    """Split csv file in rows and extract usefull information"""
    rows = []
    with open(filename, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if is_valid_row(row):
                rows.append({"pid": row["PID"], "docType": row["document type"],
                             "url": row["URL"]})
    return rows

def main():
    """Main culturize function """
    args = parse_args()
    rows = parse_csv(args.csv)

    file_name = 'nginx_redirect.conf' if args.target == 'nginx' else '.htaccess'
    directory = args.dest if args.dest else ''

    result = construct_webserver_rules(rows, args.target)
    destination_file_path = construct_file_path(directory, file_name)

    with open(destination_file_path, 'w') as d:
        d.write(result)

if __name__ == "__main__":
    main()
